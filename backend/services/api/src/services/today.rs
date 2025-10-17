use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;
use sqlx::{Row, SqlitePool};
use tracing::instrument;
use uuid::Uuid;

use crate::domain::memory_card::calculate_priority;
use crate::domain::{
    DirectionStage, MemoryCard, SkillLevel, TodayWorkoutPlan, WorkoutCardProgress,
    WorkoutCompletionSummary, WorkoutItemPlan, WorkoutPhase, WorkoutResultKind,
    WorkoutSegmentDirectionFocus, WorkoutSegmentFocus, WorkoutSegmentPlan,
    WorkoutSegmentSkillFocus, WorkoutStatus, WorkoutSummaryDirectionBreakdown,
    WorkoutSummaryMetrics, WorkoutSummarySkillBreakdown, WorkoutTotals,
};
use crate::error::{AppError, AppResult};
use crate::repositories::directions::DirectionRepository;
use crate::repositories::memory_cards::{CardReviewStats, MemoryCardRepository};
use crate::repositories::skill_points::SkillPointRepository;
use crate::repositories::workouts::WorkoutRepository;

const MAX_TODAY_CARDS: usize = 20;
const QUIZ_TARGET: usize = 5;
const APPLY_TARGET: usize = 10;
const REVIEW_TARGET: usize = 5;
const PASS_STABILITY_BOOST: f64 = 0.15;
const FAIL_STABILITY_PENALTY: f64 = 0.5;
const PASS_BASE_INTERVAL_HOURS: f64 = 24.0;
const FAIL_BASE_INTERVAL_HOURS: f64 = 6.0;

#[derive(Debug, Clone, Deserialize)]
pub struct WorkoutItemResultInput {
    pub item_id: Uuid,
    pub result: WorkoutResultKind,
}

pub struct TodayScheduler<'a> {
    pool: &'a SqlitePool,
}

impl<'a> TodayScheduler<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    #[instrument(skip(self))]
    pub async fn get_or_schedule(&self) -> AppResult<Option<TodayWorkoutPlan>> {
        let now = Utc::now();
        let repo = WorkoutRepository::new(self.pool);

        if let Some(plan) = repo.latest_pending_for_day(now).await? {
            return Ok(Some(plan));
        }

        // Quick existence check to avoid scheduling empty workouts
        if !repo.has_any_cards().await? {
            return Ok(None);
        }

        let card_repo = MemoryCardRepository::new(self.pool);
        let cards = card_repo.list_for_today(now, MAX_TODAY_CARDS * 3).await?;

        if cards.is_empty() {
            return Ok(None);
        }

        let review_stats = card_repo.review_stats().await?;
        let direction_repo = DirectionRepository::new(self.pool);
        let direction_map: HashMap<Uuid, DirectionDescriptor> = direction_repo
            .list()
            .await?
            .into_iter()
            .map(|direction| {
                (
                    direction.id,
                    DirectionDescriptor {
                        name: direction.name,
                        stage: direction.stage,
                    },
                )
            })
            .collect();

        let skill_repo = SkillPointRepository::new(self.pool);
        let skill_map: HashMap<Uuid, SkillPointDescriptor> = skill_repo
            .list_all()
            .await?
            .into_iter()
            .map(|skill| {
                (
                    skill.id,
                    SkillPointDescriptor {
                        name: skill.name,
                        level: skill.level,
                    },
                )
            })
            .collect();

        let segments = schedule_segments(now, cards, review_stats, &direction_map, &skill_map);

        if segments.iter().all(|segment| segment.cards.is_empty()) {
            return Ok(None);
        }

        let plan = build_plan(now, segments);
        repo.create_today_workout(&plan).await?;

        Ok(Some(plan))
    }

    #[instrument(skip(self, inputs))]
    pub async fn complete_workout(
        &self,
        workout_id: Uuid,
        inputs: Vec<WorkoutItemResultInput>,
    ) -> AppResult<WorkoutCompletionSummary> {
        if inputs.is_empty() {
            return Err(AppError::Validation("results cannot be empty".to_string()));
        }

        let repo = WorkoutRepository::new(self.pool);
        repo.ensure_pending(workout_id).await?;

        let direction_repo = DirectionRepository::new(self.pool);
        let direction_lookup: HashMap<Uuid, _> = direction_repo
            .list()
            .await?
            .into_iter()
            .map(|direction| (direction.id, direction))
            .collect();

        let skill_repo = SkillPointRepository::new(self.pool);
        let skill_lookup: HashMap<Uuid, _> = skill_repo
            .list_all()
            .await?
            .into_iter()
            .map(|skill| (skill.id, skill))
            .collect();

        let map = fetch_item_card_map(self.pool, workout_id).await?;

        let now = Utc::now();
        let mut payload_updates = HashMap::new();
        let mut progress = Vec::new();
        let mut pass_count = 0usize;
        let mut fail_count = 0usize;
        let mut kv_delta = 0.0;
        let mut total_uncertainty_before = 0.0;
        let mut total_uncertainty_delta = 0.0;
        let mut insight_titles: HashMap<Uuid, String> = HashMap::new();
        let mut fail_candidates: Vec<(Uuid, f64)> = Vec::new();
        let mut novelty_candidates: Vec<(Uuid, f64)> = Vec::new();

        #[derive(Default)]
        struct DirectionAggregation {
            total: usize,
            pass_count: usize,
            fail_count: usize,
            kv_delta: f64,
            uncertainty_before: f64,
            uncertainty_delta: f64,
            priority_sum: f64,
        }

        #[derive(Default)]
        struct SkillAggregation {
            total: usize,
            pass_count: usize,
            fail_count: usize,
            kv_delta: f64,
            uncertainty_before: f64,
            uncertainty_delta: f64,
            priority_sum: f64,
        }

        let mut direction_aggregates: HashMap<Uuid, DirectionAggregation> = HashMap::new();
        let mut skill_aggregates: HashMap<Uuid, SkillAggregation> = HashMap::new();

        for input in inputs {
            let Some(&card_id) = map.get(&input.item_id) else {
                return Err(AppError::Validation(format!(
                    "unknown workout item {}",
                    input.item_id
                )));
            };

            let mut card_record = fetch_card_for_update(self.pool, card_id).await?;
            insight_titles.insert(card_id, card_record.title.clone());
            let CardUpdateOutcome {
                progress: card_progress,
                next_due,
                novelty,
                previous_stability,
                stability_delta,
                direction_id,
                skill_point_id,
            } = apply_result(&mut card_record, input.result, now)?;

            persist_card(self.pool, &card_record, now).await?;

            payload_updates.insert(
                input.item_id,
                serde_json::json!({
                    "result": card_progress.result.as_str(),
                    "next_due": next_due.map(|dt| dt.to_rfc3339()),
                    "stability": card_progress.stability,
                    "priority": card_progress.priority,
                }),
            );
            progress.push(card_progress.clone());

            total_uncertainty_before += (1.0 - previous_stability).max(0.0);
            total_uncertainty_delta += stability_delta;

            let (kv_contribution, is_pass) = match card_progress.result {
                WorkoutResultKind::Pass => {
                    pass_count += 1;
                    novelty_candidates.push((card_progress.card_id, novelty));
                    (0.08 * card_progress.priority.max(0.0), true)
                }
                WorkoutResultKind::Fail => {
                    fail_count += 1;
                    fail_candidates.push((card_progress.card_id, card_progress.priority));
                    (-0.06 * (1.0 - card_progress.priority).max(0.0), false)
                }
            };

            kv_delta += kv_contribution;

            let direction_entry = direction_aggregates.entry(direction_id).or_default();
            direction_entry.total += 1;
            direction_entry.priority_sum += card_progress.priority;
            direction_entry.uncertainty_before += (1.0 - previous_stability).max(0.0);
            direction_entry.uncertainty_delta += stability_delta;
            direction_entry.kv_delta += kv_contribution;
            if is_pass {
                direction_entry.pass_count += 1;
            } else {
                direction_entry.fail_count += 1;
            }

            if let Some(skill_id) = skill_point_id {
                let skill_entry = skill_aggregates.entry(skill_id).or_default();
                skill_entry.total += 1;
                skill_entry.priority_sum += card_progress.priority;
                skill_entry.uncertainty_before += (1.0 - previous_stability).max(0.0);
                skill_entry.uncertainty_delta += stability_delta;
                skill_entry.kv_delta += kv_contribution;
                if is_pass {
                    skill_entry.pass_count += 1;
                } else {
                    skill_entry.fail_count += 1;
                }
            }

            sqlx::query("UPDATE workout_items SET result = ?, due_at = ? WHERE id = ?")
                .bind(input.result.as_str())
                .bind(next_due.map(|dt| dt.to_rfc3339()))
                .bind(input.item_id.to_string())
                .execute(self.pool)
                .await?;
        }

        sqlx::query(
            "UPDATE workouts SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(WorkoutStatus::Completed.as_str())
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(workout_id.to_string())
        .execute(self.pool)
        .await?;

        repo.append_result_to_payload(workout_id, &payload_updates)
            .await?;

        let total_items = progress.len();
        let pass_rate = if total_items > 0 {
            pass_count as f64 / total_items as f64
        } else {
            0.0
        };
        let kv_delta = kv_delta.clamp(-1.5, 1.5);
        let mut udr = if total_uncertainty_before > 1e-6 {
            total_uncertainty_delta / total_uncertainty_before
        } else if total_items > 0 {
            total_uncertainty_delta / total_items as f64
        } else {
            0.0
        };
        udr = udr.clamp(-1.0, 1.0);

        let mut direction_breakdown: Vec<WorkoutSummaryDirectionBreakdown> = direction_aggregates
            .into_iter()
            .map(|(direction_id, data)| {
                let pass_rate = if data.total > 0 {
                    data.pass_count as f64 / data.total as f64
                } else {
                    0.0
                };
                let avg_priority = if data.total > 0 {
                    data.priority_sum / data.total as f64
                } else {
                    0.0
                };
                let mut direction_udr = if data.uncertainty_before > 1e-6 {
                    data.uncertainty_delta / data.uncertainty_before
                } else if data.total > 0 {
                    data.uncertainty_delta / data.total as f64
                } else {
                    0.0
                };
                direction_udr = direction_udr.clamp(-1.0, 1.0);
                let share = if total_items > 0 {
                    data.total as f64 / total_items as f64
                } else {
                    0.0
                };
                let (name, stage) = match direction_lookup.get(&direction_id) {
                    Some(direction) => (direction.name.clone(), direction.stage.clone()),
                    None => ("未命名方向".to_string(), DirectionStage::Explore),
                };

                WorkoutSummaryDirectionBreakdown {
                    direction_id,
                    name,
                    stage,
                    total: data.total,
                    pass_count: data.pass_count,
                    fail_count: data.fail_count,
                    pass_rate,
                    kv_delta: data.kv_delta,
                    udr: direction_udr,
                    avg_priority,
                    share,
                }
            })
            .collect();
        direction_breakdown
            .sort_by(|a, b| b.share.partial_cmp(&a.share).unwrap_or(Ordering::Equal));

        let mut skill_breakdown: Vec<WorkoutSummarySkillBreakdown> = skill_aggregates
            .into_iter()
            .map(|(skill_id, data)| {
                let pass_rate = if data.total > 0 {
                    data.pass_count as f64 / data.total as f64
                } else {
                    0.0
                };
                let avg_priority = if data.total > 0 {
                    data.priority_sum / data.total as f64
                } else {
                    0.0
                };
                let mut skill_udr = if data.uncertainty_before > 1e-6 {
                    data.uncertainty_delta / data.uncertainty_before
                } else if data.total > 0 {
                    data.uncertainty_delta / data.total as f64
                } else {
                    0.0
                };
                skill_udr = skill_udr.clamp(-1.0, 1.0);
                let share = if total_items > 0 {
                    data.total as f64 / total_items as f64
                } else {
                    0.0
                };
                let (name, level) = match skill_lookup.get(&skill_id) {
                    Some(skill) => (skill.name.clone(), skill.level),
                    None => ("未命名技能".to_string(), SkillLevel::Unknown),
                };

                WorkoutSummarySkillBreakdown {
                    skill_point_id: skill_id,
                    name,
                    level,
                    total: data.total,
                    pass_count: data.pass_count,
                    fail_count: data.fail_count,
                    pass_rate,
                    kv_delta: data.kv_delta,
                    udr: skill_udr,
                    avg_priority,
                    share,
                }
            })
            .collect();
        skill_breakdown.sort_by(|a, b| b.share.partial_cmp(&a.share).unwrap_or(Ordering::Equal));

        let mut recommended_focus = if let Some((card_id, priority)) = fail_candidates
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(Ordering::Equal))
        {
            let title = insight_titles
                .get(&card_id)
                .cloned()
                .unwrap_or_else(|| "关键卡片".to_string());
            Some(format!(
                "重练「{}」，优先级 {:.0}% ，建议明天优先安排复盘。",
                title,
                (priority * 100.0).round()
            ))
        } else if let Some((card_id, novelty)) = novelty_candidates
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(Ordering::Equal))
        {
            let title = insight_titles
                .get(&card_id)
                .cloned()
                .unwrap_or_else(|| "关键卡片".to_string());
            Some(format!(
                "尝试在实际任务中应用「{}」，新颖度 {:.0}% ，趁热打铁。",
                title,
                (novelty * 100.0).round()
            ))
        } else {
            None
        };

        if recommended_focus.is_none() {
            if let Some(skill_focus) = recommend_skill_gap(self.pool, now).await? {
                recommended_focus = Some(skill_focus);
            }
        }
        if recommended_focus.is_none() {
            recommended_focus = recommend_neglected_direction(self.pool, now).await?;
        }

        let mut insights = Vec::new();
        if fail_count > 0 {
            insights.push(format!(
                "{} 张卡片被标记为重练，先补齐薄弱环节。",
                fail_count
            ));
        }
        if pass_rate >= 0.85 {
            insights.push("正确率良好，可加大应用练习比重。".to_string());
        } else if pass_rate <= 0.6 {
            insights.push("正确率偏低，建议先复盘基础概念。".to_string());
        }
        if kv_delta > 0.2 {
            insights.push(format!("知识速度 +{:.2}，保持势头。", kv_delta));
        } else if kv_delta < -0.2 {
            insights.push(format!("知识速度 {:.2}，尝试收敛训练范围。", kv_delta));
        }
        if udr > 0.25 {
            insights.push(format!(
                "不确定性下降率 {:+.0}% ，今日巩固显著。",
                udr * 100.0
            ));
        } else if udr < -0.1 {
            insights.push(format!(
                "不确定性上升 {:+.0}% ，建议聚焦错题复盘。",
                udr * 100.0
            ));
        }
        if insights.is_empty() {
            insights.push("继续保持节奏，明日自动生成新队列。".to_string());
        }

        let metrics = WorkoutSummaryMetrics {
            total_items,
            pass_count,
            fail_count,
            pass_rate,
            kv_delta,
            udr,
            recommended_focus: recommended_focus.clone(),
            direction_breakdown,
            skill_breakdown,
        };

        repo.record_summary(workout_id, now, &metrics).await?;

        Ok(WorkoutCompletionSummary {
            workout_id,
            completed_at: now,
            updates: progress,
            metrics,
            insights,
        })
    }
}

struct SegmentAllocation {
    phase: WorkoutPhase,
    focus: Option<String>,
    focus_details: Option<WorkoutSegmentFocus>,
    cards: Vec<MemoryCard>,
}

#[derive(Debug, Clone)]
struct DirectionDescriptor {
    name: String,
    stage: DirectionStage,
}

#[derive(Debug, Clone)]
struct SkillPointDescriptor {
    name: String,
    level: SkillLevel,
}

#[derive(Debug, Clone, Copy, Default)]
struct DirectionSignal {
    due_pressure: f64,
    fail_pressure: f64,
    new_pressure: f64,
    unstable_pressure: f64,
    momentum_pressure: f64,
    avg_priority: f64,
    neglect_pressure: f64,
}

#[derive(Debug, Clone, Copy)]
struct SkillSignal {
    level: SkillLevel,
    due_pressure: f64,
    fail_pressure: f64,
    new_pressure: f64,
    unstable_pressure: f64,
    momentum_pressure: f64,
    neglect_pressure: f64,
    avg_priority: f64,
    count: usize,
}

impl Default for SkillSignal {
    fn default() -> Self {
        Self {
            level: SkillLevel::Unknown,
            due_pressure: 0.0,
            fail_pressure: 0.0,
            new_pressure: 0.0,
            unstable_pressure: 0.0,
            momentum_pressure: 0.0,
            neglect_pressure: 0.0,
            avg_priority: 0.0,
            count: 0,
        }
    }
}

impl SkillSignal {
    fn level_gap(&self) -> f64 {
        match self.level {
            SkillLevel::Unknown => 0.9,
            SkillLevel::Emerging => 0.75,
            SkillLevel::Working => 0.5,
            SkillLevel::Fluent => 0.25,
        }
    }

    fn quiz_bias(&self) -> f64 {
        clamp_unit(
            0.4 * self.level_gap()
                + 0.25 * self.due_pressure
                + 0.2 * self.new_pressure
                + 0.1 * self.neglect_pressure
                + 0.05 * self.avg_priority,
        )
    }

    fn apply_bias(&self) -> f64 {
        clamp_unit(
            0.4 * self.level_gap()
                + 0.2 * self.new_pressure
                + 0.15 * (1.0 - self.fail_pressure).max(0.0)
                + 0.15 * self.momentum_pressure
                + 0.1 * self.avg_priority
                + 0.1 * (1.0 - self.neglect_pressure).max(0.0),
        )
    }

    fn review_bias(&self) -> f64 {
        clamp_unit(
            0.45 * self.level_gap()
                + 0.3 * self.fail_pressure
                + 0.15 * self.unstable_pressure
                + 0.1 * self.neglect_pressure,
        )
    }

    fn for_phase(&self, phase: WorkoutPhase) -> f64 {
        match phase {
            WorkoutPhase::Quiz => self.quiz_bias(),
            WorkoutPhase::Apply => self.apply_bias(),
            WorkoutPhase::Review => self.review_bias(),
        }
    }

    fn growth_pressure(&self) -> f64 {
        clamp_unit(
            0.5 * self.level_gap()
                + 0.2 * self.fail_pressure
                + 0.2 * self.neglect_pressure
                + 0.1 * self.new_pressure,
        )
    }

    fn share(&self, total: usize) -> f64 {
        if total == 0 {
            0.0
        } else {
            (self.count as f64 / total as f64).clamp(0.0, 1.0)
        }
    }
}

impl DirectionSignal {
    fn quiz_bias(&self) -> f64 {
        clamp_unit(
            0.45 * self.due_pressure
                + 0.25 * self.new_pressure
                + 0.15 * self.unstable_pressure
                + 0.15 * self.neglect_pressure,
        )
    }

    fn apply_bias(&self) -> f64 {
        clamp_unit(
            0.35 * self.momentum_pressure
                + 0.25 * self.avg_priority
                + 0.2 * self.new_pressure
                + 0.1 * self.neglect_pressure
                + 0.2 * (1.0 - self.fail_pressure).max(0.0),
        )
    }

    fn review_bias(&self) -> f64 {
        clamp_unit(
            0.55 * self.fail_pressure
                + 0.2 * self.unstable_pressure
                + 0.15 * self.due_pressure
                + 0.1 * self.neglect_pressure,
        )
    }

    fn for_phase(&self, phase: WorkoutPhase) -> f64 {
        match phase {
            WorkoutPhase::Quiz => self.quiz_bias(),
            WorkoutPhase::Apply => self.apply_bias(),
            WorkoutPhase::Review => self.review_bias(),
        }
    }

    fn composite_bias(&self) -> f64 {
        clamp_unit(
            0.3 * self.due_pressure
                + 0.3 * self.fail_pressure
                + 0.2 * self.avg_priority
                + 0.15 * self.momentum_pressure
                + 0.05 * self.neglect_pressure,
        )
    }
}

fn build_plan(now: DateTime<Utc>, segments_cards: Vec<SegmentAllocation>) -> TodayWorkoutPlan {
    let workout_id = Uuid::new_v4();
    let scheduled_for = now;
    let generated_at = now;

    let mut totals = WorkoutTotals::default();
    let mut segments = Vec::new();

    for SegmentAllocation {
        phase,
        focus,
        focus_details,
        cards,
    } in segments_cards
    {
        if cards.is_empty() {
            continue;
        }

        let mut items = Vec::with_capacity(cards.len());
        for (idx, card) in cards.into_iter().enumerate() {
            items.push(WorkoutItemPlan {
                item_id: Uuid::new_v4(),
                sequence: idx as u32,
                card,
            });
        }

        match phase {
            WorkoutPhase::Quiz => totals.quiz += items.len(),
            WorkoutPhase::Apply => totals.apply += items.len(),
            WorkoutPhase::Review => totals.review += items.len(),
        }

        segments.push(WorkoutSegmentPlan {
            phase,
            focus,
            focus_details,
            items,
        });
    }

    totals.total_cards = totals.quiz + totals.apply + totals.review;

    TodayWorkoutPlan {
        workout_id,
        scheduled_for,
        generated_at,
        segments,
        totals,
    }
}

async fn recommend_skill_gap(pool: &SqlitePool, now: DateTime<Utc>) -> AppResult<Option<String>> {
    let card_repo = MemoryCardRepository::new(pool);
    let cards = card_repo.list_for_today(now, MAX_TODAY_CARDS * 3).await?;
    if cards.is_empty() {
        return Ok(None);
    }

    let stats = card_repo.review_stats().await?;
    let skill_repo = SkillPointRepository::new(pool);
    let skill_map: HashMap<Uuid, SkillPointDescriptor> = skill_repo
        .list_all()
        .await?
        .into_iter()
        .map(|skill| {
            (
                skill.id,
                SkillPointDescriptor {
                    name: skill.name,
                    level: skill.level,
                },
            )
        })
        .collect();

    let card_map: HashMap<Uuid, MemoryCard> =
        cards.into_iter().map(|card| (card.id, card)).collect();

    let skill_signals = analyze_skill_signals(&card_map, &stats, now, &skill_map);
    if skill_signals.is_empty() {
        return Ok(None);
    }

    let total_with_skills = card_map
        .values()
        .filter(|card| card.skill_point_id.is_some())
        .count();

    if total_with_skills == 0 {
        return Ok(None);
    }

    let candidate = skill_signals
        .into_iter()
        .filter(|(_, signal)| signal.growth_pressure() >= 0.45)
        .max_by(|(_, a), (_, b)| {
            a.growth_pressure()
                .partial_cmp(&b.growth_pressure())
                .unwrap_or(Ordering::Equal)
        });

    let Some((skill_id, signal)) = candidate else {
        return Ok(None);
    };

    let descriptor = skill_descriptor(&skill_map, skill_id);
    let level_label = match descriptor.level {
        SkillLevel::Unknown => "未评估",
        SkillLevel::Emerging => "起步",
        SkillLevel::Working => "攻坚",
        SkillLevel::Fluent => "固化",
    };
    let demand = (signal.growth_pressure() * 100.0).round();
    let coverage = signal.count;
    let share = (signal.share(total_with_skills) * 100.0).round();

    let recommendation = format!(
        "技能「{}」({}) 成长压力 {:.0}% ，候选 {} 张（覆盖 {}%），建议安排针对性应用与复盘。",
        descriptor.name, level_label, demand, coverage, share
    );

    Ok(Some(recommendation))
}

async fn recommend_neglected_direction(
    pool: &SqlitePool,
    now: DateTime<Utc>,
) -> AppResult<Option<String>> {
    let card_repo = MemoryCardRepository::new(pool);
    let cards = card_repo.list_for_today(now, MAX_TODAY_CARDS * 3).await?;
    if cards.is_empty() {
        return Ok(None);
    }

    let stats = card_repo.review_stats().await?;
    let direction_repo = DirectionRepository::new(pool);
    let direction_map: HashMap<Uuid, DirectionDescriptor> = direction_repo
        .list()
        .await?
        .into_iter()
        .map(|direction| {
            (
                direction.id,
                DirectionDescriptor {
                    name: direction.name,
                    stage: direction.stage,
                },
            )
        })
        .collect();

    let card_map: HashMap<Uuid, MemoryCard> =
        cards.into_iter().map(|card| (card.id, card)).collect();

    let direction_signals = analyze_direction_signals(&card_map, &stats, now);
    let mut neglected_counts: HashMap<Uuid, usize> = HashMap::new();
    for (card_id, card) in &card_map {
        let staleness = stats
            .get(card_id)
            .map(|stat| staleness_from_stats(stat, now))
            .unwrap_or(1.0);
        if staleness >= 0.7 {
            *neglected_counts.entry(card.direction_id).or_insert(0) += 1;
        }
    }

    let neglected = direction_signals
        .into_iter()
        .filter(|(_, signal)| signal.neglect_pressure >= 0.45)
        .max_by(|(_, a), (_, b)| {
            a.neglect_pressure
                .partial_cmp(&b.neglect_pressure)
                .unwrap_or(Ordering::Equal)
        });

    let Some((direction_id, signal)) = neglected else {
        return Ok(None);
    };

    let direction = direction_map
        .get(&direction_id)
        .cloned()
        .unwrap_or(DirectionDescriptor {
            name: "未设定方向".to_string(),
            stage: DirectionStage::Explore,
        });

    let neglected_cards = neglected_counts.get(&direction_id).copied().unwrap_or(0);
    let demand = (signal.neglect_pressure * 100.0).round();
    let recommendation = if neglected_cards > 0 {
        format!(
            "方向「{}」有 {} 张卡片超过 5 天未练（唤醒需求 {:.0}%），建议明日安排唤醒训练。",
            direction.name, neglected_cards, demand
        )
    } else {
        format!(
            "方向「{}」唤醒需求 {:.0}% ，建议明日安排补齐训练。",
            direction.name, demand
        )
    };

    Ok(Some(recommendation))
}

fn schedule_segments(
    now: DateTime<Utc>,
    cards: Vec<MemoryCard>,
    stats: HashMap<Uuid, CardReviewStats>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    skills: &HashMap<Uuid, SkillPointDescriptor>,
) -> Vec<SegmentAllocation> {
    if cards.is_empty() {
        return Vec::new();
    }

    let total_pool = cards.len().min(MAX_TODAY_CARDS);
    if total_pool == 0 {
        return Vec::new();
    }

    let (quiz_target, apply_target, review_target) = calculate_segment_targets(total_pool);

    let card_map: HashMap<Uuid, MemoryCard> =
        cards.into_iter().map(|card| (card.id, card)).collect();
    let direction_signals = analyze_direction_signals(&card_map, &stats, now);
    let skill_signals = analyze_skill_signals(&card_map, &stats, now, skills);
    let mut score_map: HashMap<Uuid, SegmentScores> = HashMap::with_capacity(card_map.len());

    for (id, card) in &card_map {
        let stat = stats.get(id).cloned().unwrap_or_default();
        let scores = compute_segment_scores(
            card,
            &stat,
            now,
            directions,
            &direction_signals,
            &skill_signals,
        );
        score_map.insert(*id, scores);
    }

    let targets = [
        (WorkoutPhase::Quiz, quiz_target),
        (WorkoutPhase::Apply, apply_target),
        (WorkoutPhase::Review, review_target),
    ];

    let mut selected = HashSet::new();
    let mut segments = Vec::with_capacity(targets.len());

    for (phase, target) in targets {
        if target == 0 {
            segments.push(SegmentAllocation {
                phase,
                focus: None,
                focus_details: None,
                cards: Vec::new(),
            });
            continue;
        }

        let mut seeded = seed_phase(
            phase,
            target,
            now,
            &stats,
            &card_map,
            &mut selected,
            directions,
            &direction_signals,
            &skill_signals,
        );

        if seeded.len() < target {
            let remaining = target - seeded.len();
            if remaining > 0 {
                let additional = pick_for_phase(
                    phase,
                    remaining,
                    &score_map,
                    &card_map,
                    &mut selected,
                    &direction_signals,
                    &skill_signals,
                );
                seeded.extend(additional);
            }
        }

        segments.push(SegmentAllocation {
            phase,
            focus: None,
            focus_details: None,
            cards: seeded,
        });
    }

    fill_segment_shortfalls(
        &mut segments,
        &targets,
        &score_map,
        &card_map,
        &mut selected,
        &direction_signals,
        &skill_signals,
    );

    for segment in &mut segments {
        if !segment.cards.is_empty() {
            let details = derive_focus(
                segment.phase,
                &segment.cards,
                now,
                &stats,
                directions,
                skills,
                &skill_signals,
            );
            segment.focus = details.as_ref().map(|focus| focus.headline.clone());
            segment.focus_details = details;
        }
    }

    segments
}

fn analyze_direction_signals(
    card_map: &HashMap<Uuid, MemoryCard>,
    stats: &HashMap<Uuid, CardReviewStats>,
    now: DateTime<Utc>,
) -> HashMap<Uuid, DirectionSignal> {
    #[derive(Default)]
    struct Accumulator {
        count: usize,
        due: f64,
        fail: f64,
        new_cards: f64,
        unstable: f64,
        momentum: f64,
        priority: f64,
        stale: f64,
    }

    let mut map: HashMap<Uuid, Accumulator> = HashMap::new();

    for card in card_map.values() {
        let entry = map.entry(card.direction_id).or_default();
        entry.count += 1;
        entry.due += due_urgency(card, now);
        entry.unstable += clamp_unit(1.0 - card.stability);
        entry.priority += clamp_unit(card.priority);

        match stats.get(&card.id) {
            Some(stats) => {
                if stats.total_reviews() == 0 {
                    entry.new_cards += 1.0;
                }
                let fail_component = 0.6 * stats.fail_rate()
                    + 0.2 * clamp_unit(stats.consecutive_fails as f64 / 3.0)
                    + stats
                        .last_fail_at
                        .map(|last_fail| {
                            let minutes = now.signed_duration_since(last_fail).num_minutes() as f64;
                            (1.0 - (minutes / (72.0 * 60.0))).clamp(0.0, 1.0) * 0.2
                        })
                        .unwrap_or(0.0);
                entry.fail += fail_component;
                entry.momentum += clamp_unit(stats.consecutive_passes as f64 / 4.0);
                entry.stale += staleness_from_stats(stats, now);
            }
            None => {
                entry.new_cards += 1.0;
                entry.stale += 1.0;
            }
        }
    }

    map.into_iter()
        .map(|(direction_id, acc)| {
            let denom = acc.count as f64;
            let normalise = |value: f64| -> f64 {
                if denom <= 0.0 {
                    0.0
                } else {
                    (value / denom).clamp(0.0, 1.0)
                }
            };

            (
                direction_id,
                DirectionSignal {
                    due_pressure: normalise(acc.due),
                    fail_pressure: normalise(acc.fail),
                    new_pressure: normalise(acc.new_cards),
                    unstable_pressure: normalise(acc.unstable),
                    momentum_pressure: normalise(acc.momentum),
                    avg_priority: normalise(acc.priority),
                    neglect_pressure: normalise(acc.stale),
                },
            )
        })
        .collect()
}

fn analyze_skill_signals(
    card_map: &HashMap<Uuid, MemoryCard>,
    stats: &HashMap<Uuid, CardReviewStats>,
    now: DateTime<Utc>,
    skills: &HashMap<Uuid, SkillPointDescriptor>,
) -> HashMap<Uuid, SkillSignal> {
    #[derive(Default)]
    struct Accumulator {
        count: usize,
        due: f64,
        fail: f64,
        new_cards: f64,
        unstable: f64,
        momentum: f64,
        priority: f64,
        stale: f64,
    }

    let mut map: HashMap<Uuid, Accumulator> = HashMap::new();

    for card in card_map.values() {
        let Some(skill_id) = card.skill_point_id else {
            continue;
        };
        let entry = map.entry(skill_id).or_default();
        entry.count += 1;
        entry.due += due_urgency(card, now);
        entry.unstable += clamp_unit(1.0 - card.stability);
        entry.priority += clamp_unit(card.priority);

        match stats.get(&card.id) {
            Some(stats) => {
                if stats.total_reviews() == 0 {
                    entry.new_cards += 1.0;
                }
                entry.fail += (0.6 * stats.fail_rate())
                    + (0.2 * clamp_unit(stats.consecutive_fails as f64 / 3.0));
                entry.momentum += clamp_unit(stats.consecutive_passes as f64 / 4.0);
                entry.stale += staleness_from_stats(stats, now);
            }
            None => {
                entry.new_cards += 1.0;
                entry.stale += 1.0;
            }
        }
    }

    map.into_iter()
        .map(|(skill_id, acc)| {
            let descriptor = skill_descriptor(skills, skill_id);
            let denom = acc.count as f64;
            let normalise = |value: f64| -> f64 {
                if denom <= 0.0 {
                    0.0
                } else {
                    (value / denom).clamp(0.0, 1.0)
                }
            };

            (
                skill_id,
                SkillSignal {
                    level: descriptor.level,
                    due_pressure: normalise(acc.due),
                    fail_pressure: normalise(acc.fail),
                    new_pressure: normalise(acc.new_cards),
                    unstable_pressure: normalise(acc.unstable),
                    momentum_pressure: normalise(acc.momentum),
                    neglect_pressure: normalise(acc.stale),
                    avg_priority: normalise(acc.priority),
                    count: acc.count,
                },
            )
        })
        .collect()
}

fn calculate_segment_targets(total_available: usize) -> (usize, usize, usize) {
    if total_available == 0 {
        return (0, 0, 0);
    }
    if total_available >= MAX_TODAY_CARDS {
        return (QUIZ_TARGET, APPLY_TARGET, REVIEW_TARGET);
    }

    let base = [
        QUIZ_TARGET as f64,
        APPLY_TARGET as f64,
        REVIEW_TARGET as f64,
    ];
    let mut targets = [0usize; 3];
    let mut allocated = 0usize;

    for (idx, portion) in base.iter().enumerate() {
        if allocated >= total_available {
            break;
        }
        let share = ((*portion / MAX_TODAY_CARDS as f64) * total_available as f64).floor() as usize;
        let share = share.min(total_available - allocated);
        targets[idx] = share;
        allocated += share;
    }

    let mut idx = 0usize;
    while allocated < total_available {
        targets[idx % 3] += 1;
        allocated += 1;
        idx += 1;
    }

    if total_available >= 3 {
        for value in targets.iter_mut() {
            if *value == 0 {
                *value = 1;
            }
        }
    }

    let mut sum = targets.iter().sum::<usize>();
    while sum > total_available {
        if let Some((max_idx, _)) = targets.iter().enumerate().max_by(|(_, a), (_, b)| a.cmp(b)) {
            if targets[max_idx] > 0 {
                targets[max_idx] -= 1;
                sum -= 1;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    (targets[0], targets[1], targets[2])
}

fn seed_phase(
    phase: WorkoutPhase,
    target: usize,
    now: DateTime<Utc>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    card_map: &HashMap<Uuid, MemoryCard>,
    selected: &mut HashSet<Uuid>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> Vec<MemoryCard> {
    match phase {
        WorkoutPhase::Quiz => seed_quiz_phase(
            target,
            now,
            stats_map,
            card_map,
            selected,
            directions,
            direction_signals,
            skill_signals,
        ),
        WorkoutPhase::Apply => seed_apply_phase(
            target,
            now,
            stats_map,
            card_map,
            selected,
            directions,
            direction_signals,
            skill_signals,
        ),
        WorkoutPhase::Review => seed_review_phase(
            target,
            now,
            stats_map,
            card_map,
            selected,
            directions,
            direction_signals,
            skill_signals,
        ),
    }
}

fn seed_quiz_phase(
    target: usize,
    now: DateTime<Utc>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    card_map: &HashMap<Uuid, MemoryCard>,
    selected: &mut HashSet<Uuid>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> Vec<MemoryCard> {
    if target == 0 {
        return Vec::new();
    }

    let cap = target.min(4);
    let mut entries: Vec<(Uuid, f64)> = card_map
        .iter()
        .filter_map(|(&id, card)| {
            if selected.contains(&id) {
                return None;
            }
            let stats = stats_map.get(&id).cloned().unwrap_or_default();
            let due = due_urgency(card, now);
            let is_new = stats.last_seen.is_none();
            let direction_signal = direction_signals
                .get(&card.direction_id)
                .copied()
                .unwrap_or_default();
            let skill_signal = card
                .skill_point_id
                .and_then(|skill_id| skill_signals.get(&skill_id).copied())
                .unwrap_or_default();
            if due < 0.55 && !is_new && direction_signal.neglect_pressure < 0.45 {
                return None;
            }
            let stability_gap = clamp_unit(1.0 - card.stability);
            let novelty = clamp_unit(card.novelty);
            let bias = stage_bias_for(directions, card.direction_id).quiz;
            let direction_bias = direction_signal.quiz_bias();
            let score = 0.45 * due
                + 0.25 * stability_gap
                + 0.2 * novelty
                + if is_new { 0.1 } else { 0.0 }
                + bias
                + 0.2 * direction_bias
                + 0.12 * direction_signal.neglect_pressure
                + 0.08 * skill_signal.quiz_bias()
                + 0.05 * skill_signal.level_gap();
            Some((id, score))
        })
        .collect();

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));

    let mut picks = Vec::new();
    for (id, _) in entries.into_iter().take(cap) {
        if let Some(card) = card_map.get(&id) {
            selected.insert(id);
            picks.push(card.clone());
        }
    }

    picks
}

fn seed_apply_phase(
    target: usize,
    now: DateTime<Utc>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    card_map: &HashMap<Uuid, MemoryCard>,
    selected: &mut HashSet<Uuid>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> Vec<MemoryCard> {
    if target == 0 {
        return Vec::new();
    }

    let cap = target.min(4);
    let mut entries: Vec<(Uuid, f64)> = card_map
        .iter()
        .filter_map(|(&id, card)| {
            if selected.contains(&id) {
                return None;
            }
            let stats = stats_map.get(&id).cloned().unwrap_or_default();
            let momentum = clamp_unit(stats.consecutive_passes as f64 / 4.0);
            let fail_rate = stats.fail_rate();
            let stage_bias = stage_bias_for(directions, card.direction_id);
            if momentum == 0.0 && fail_rate > 0.4 && card.novelty < 0.6 && stage_bias.apply < 0.08 {
                return None;
            }
            let freshness = freshness_score(&stats, now);
            let direction_signal = direction_signals
                .get(&card.direction_id)
                .copied()
                .unwrap_or_default();
            let direction_bias = direction_signal.apply_bias();
            let skill_signal = card
                .skill_point_id
                .and_then(|skill_id| skill_signals.get(&skill_id).copied())
                .unwrap_or_default();
            let score = 0.35 * card.relevance
                + 0.23 * card.novelty
                + 0.18 * momentum
                + 0.1 * freshness
                + 0.1 * (1.0 - fail_rate)
                + stage_bias.apply
                + 0.18 * direction_bias
                + 0.1 * direction_signal.neglect_pressure
                + 0.1 * skill_signal.apply_bias()
                + 0.06 * skill_signal.level_gap();
            Some((id, score))
        })
        .collect();

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));

    let mut picks = Vec::new();
    for (id, _) in entries.into_iter().take(cap) {
        if let Some(card) = card_map.get(&id) {
            selected.insert(id);
            picks.push(card.clone());
        }
    }

    picks
}

fn seed_review_phase(
    target: usize,
    now: DateTime<Utc>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    card_map: &HashMap<Uuid, MemoryCard>,
    selected: &mut HashSet<Uuid>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> Vec<MemoryCard> {
    if target == 0 {
        return Vec::new();
    }

    let cap = target.min(5);
    let mut entries: Vec<(Uuid, f64)> = stats_map
        .iter()
        .filter_map(|(&id, stats)| {
            if selected.contains(&id) {
                return None;
            }
            let card = card_map.get(&id)?;
            let fail_rate = stats.fail_rate();
            let streak = clamp_unit(stats.consecutive_fails as f64 / 3.0);
            if streak == 0.0 && fail_rate < 0.25 {
                return None;
            }
            let due = due_urgency(card, now);
            let recency = stats
                .last_fail_at
                .map(|last_fail| {
                    let minutes = now.signed_duration_since(last_fail).num_minutes() as f64;
                    (1.0 - (minutes / (72.0 * 60.0))).clamp(0.0, 1.0)
                })
                .unwrap_or(0.0);
            let bias = stage_bias_for(directions, card.direction_id).review;
            let direction_signal = direction_signals
                .get(&card.direction_id)
                .copied()
                .unwrap_or_default();
            let direction_bias = direction_signal.review_bias();
            let skill_signal = card
                .skill_point_id
                .and_then(|skill_id| skill_signals.get(&skill_id).copied())
                .unwrap_or_default();
            let score = 0.4 * fail_rate
                + 0.3 * streak
                + 0.2 * due
                + 0.1 * recency
                + bias
                + 0.2 * direction_bias
                + 0.1 * direction_signal.neglect_pressure
                + 0.1 * skill_signal.review_bias()
                + 0.05 * skill_signal.level_gap();
            Some((id, score))
        })
        .collect();

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));

    let mut picks = Vec::new();
    for (id, _) in entries.into_iter().take(cap) {
        if let Some(card) = card_map.get(&id) {
            selected.insert(id);
            picks.push(card.clone());
        }
    }

    picks
}

fn pick_for_phase(
    phase: WorkoutPhase,
    target: usize,
    score_map: &HashMap<Uuid, SegmentScores>,
    card_map: &HashMap<Uuid, MemoryCard>,
    selected: &mut HashSet<Uuid>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> Vec<MemoryCard> {
    let mut entries: Vec<(Uuid, f64)> = score_map
        .iter()
        .map(|(&id, scores)| {
            let direction_data = card_map
                .get(&id)
                .and_then(|card| direction_signals.get(&card.direction_id));
            let phase_bias = direction_data
                .map(|signal| signal.for_phase(phase))
                .unwrap_or(0.0);
            let neglect_bias = direction_data
                .map(|signal| signal.neglect_pressure)
                .unwrap_or(0.0);
            let skill_bias = card_map
                .get(&id)
                .and_then(|card| {
                    card.skill_point_id
                        .and_then(|skill_id| skill_signals.get(&skill_id).copied())
                })
                .unwrap_or_default();
            (
                id,
                scores.for_phase(phase)
                    + 0.12 * phase_bias
                    + 0.05 * neglect_bias
                    + 0.08 * skill_bias.for_phase(phase)
                    + 0.05 * skill_bias.growth_pressure(),
            )
        })
        .collect();

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));

    let mut picked = Vec::new();

    for (id, _) in entries {
        if picked.len() >= target {
            break;
        }
        if selected.contains(&id) {
            continue;
        }
        if let Some(card) = card_map.get(&id) {
            picked.push(card.clone());
            selected.insert(id);
        }
    }

    picked
}

fn fill_segment_shortfalls(
    segments: &mut Vec<SegmentAllocation>,
    targets: &[(WorkoutPhase, usize)],
    score_map: &HashMap<Uuid, SegmentScores>,
    card_map: &HashMap<Uuid, MemoryCard>,
    selected: &mut HashSet<Uuid>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) {
    let mut leftovers: Vec<(Uuid, f64)> = score_map
        .iter()
        .filter(|(id, _)| !selected.contains(id))
        .map(|(&id, scores)| {
            let direction_data = card_map
                .get(&id)
                .and_then(|card| direction_signals.get(&card.direction_id));
            let direction_bias = direction_data
                .map(|signal| signal.composite_bias())
                .unwrap_or(0.0);
            let neglect_bias = direction_data
                .map(|signal| signal.neglect_pressure)
                .unwrap_or(0.0);
            let skill_bias = card_map
                .get(&id)
                .and_then(|card| {
                    card.skill_point_id
                        .and_then(|skill_id| skill_signals.get(&skill_id).copied())
                })
                .unwrap_or_default();
            (
                id,
                scores.composite
                    + 0.15 * direction_bias
                    + 0.08 * neglect_bias
                    + 0.08 * skill_bias.growth_pressure(),
            )
        })
        .collect();

    leftovers.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));
    let mut iter = leftovers.into_iter();

    for (idx, segment) in segments.iter_mut().enumerate() {
        let target = targets[idx].1;
        if target == 0 {
            continue;
        }

        while segment.cards.len() < target {
            match iter.next() {
                Some((id, _)) => {
                    if selected.contains(&id) {
                        continue;
                    }
                    if let Some(card) = card_map.get(&id) {
                        segment.cards.push(card.clone());
                        selected.insert(id);
                    }
                }
                None => break,
            }
        }
    }
}

fn derive_focus(
    phase: WorkoutPhase,
    cards: &[MemoryCard],
    now: DateTime<Utc>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    skills: &HashMap<Uuid, SkillPointDescriptor>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> Option<WorkoutSegmentFocus> {
    if cards.is_empty() {
        return None;
    }

    let mut due_count = 0usize;
    let mut new_count = 0usize;
    let mut fail_focus = 0usize;
    let mut unstable_count = 0usize;
    let mut high_relevance = 0usize;
    let mut momentum_count = 0usize;
    let mut neglected_count = 0usize;

    for card in cards {
        if due_urgency(card, now) > 0.6 {
            due_count += 1;
        }
        if card.stability < 0.45 {
            unstable_count += 1;
        }
        if card.relevance >= 0.65 {
            high_relevance += 1;
        }

        let staleness = match stats_map.get(&card.id) {
            Some(stats) => {
                if stats.total_reviews() == 0 {
                    new_count += 1;
                }
                if stats.consecutive_fails > 0 || stats.fail_rate() >= 0.4 {
                    fail_focus += 1;
                }
                if stats.consecutive_passes >= 2 {
                    momentum_count += 1;
                }
                staleness_from_stats(stats, now)
            }
            None => {
                new_count += 1;
                1.0
            }
        };

        if staleness >= 0.7 {
            neglected_count += 1;
        }
    }

    let headline = match phase {
        WorkoutPhase::Quiz => {
            let base = if due_count > 0 && new_count > 0 {
                format!("到期 {} 张 · 新卡 {} 张", due_count, new_count)
            } else if due_count > 0 {
                format!("到期复习 {} 张", due_count)
            } else if new_count > 0 {
                format!("首轮测试 {} 张新卡", new_count)
            } else {
                format!("巩固 {} 张基础卡", cards.len())
            };
            format!("{}，快速检验记忆", base)
        }
        WorkoutPhase::Apply => {
            let base = if high_relevance > 0 && momentum_count > 0 {
                format!("高相关 {} 张 · 连对 {} 张", high_relevance, momentum_count)
            } else if high_relevance > 0 {
                format!("高相关练习 {} 张", high_relevance)
            } else if momentum_count > 0 {
                format!("保持连对 {} 张卡片", momentum_count)
            } else {
                format!("应用演练 {} 张卡片", cards.len())
            };
            format!("{}，用于场景化应用", base)
        }
        WorkoutPhase::Review => {
            let base = if fail_focus > 0 && unstable_count > 0 {
                format!("错题 {} 张 · 稳定度待提 {} 张", fail_focus, unstable_count)
            } else if fail_focus > 0 {
                format!("错题复盘 {} 张", fail_focus)
            } else if unstable_count > 0 {
                format!("稳定度补强 {} 张", unstable_count)
            } else {
                format!("巩固复习 {} 张卡片", cards.len())
            };
            format!("{}，收口薄弱环节", base)
        }
    };

    let mut highlights = Vec::new();
    match phase {
        WorkoutPhase::Quiz => {
            if due_count > 0 {
                highlights.push(format!("{} 张到期或过期卡", due_count));
            }
            if new_count > 0 {
                highlights.push(format!("{} 张首轮新卡", new_count));
            }
            if unstable_count > 0 {
                highlights.push(format!("{} 张稳定度待提升", unstable_count));
            }
            if neglected_count > 0 {
                highlights.push(format!("{} 张久未练卡", neglected_count));
            }
        }
        WorkoutPhase::Apply => {
            if high_relevance > 0 {
                highlights.push(format!("{} 张高相关场景", high_relevance));
            }
            if momentum_count > 0 {
                highlights.push(format!("{} 张保持连对", momentum_count));
            }
            if new_count > 0 {
                highlights.push(format!("{} 张新鲜记忆待迁移", new_count));
            }
            if neglected_count > 0 {
                highlights.push(format!("{} 张久未练卡", neglected_count));
            }
        }
        WorkoutPhase::Review => {
            if fail_focus > 0 {
                highlights.push(format!("{} 张近期错题", fail_focus));
            }
            if unstable_count > 0 {
                highlights.push(format!("{} 张稳定度 < 45%", unstable_count));
            }
            if due_count > 0 {
                highlights.push(format!("{} 张已到期卡片", due_count));
            }
            if neglected_count > 0 {
                highlights.push(format!("{} 张久未练卡", neglected_count));
            }
        }
    }

    let direction_breakdown = build_direction_breakdown(cards, directions, stats_map, now);
    let skill_breakdown = build_skill_breakdown(cards, skills, stats_map, now);

    if let Some(primary_skill) = skill_breakdown.first() {
        let share_pct = (primary_skill.share * 100.0).round();
        let summary = format!(
            "聚焦技能「{}」· {} 张（{}%）",
            primary_skill.name, primary_skill.count, share_pct as i64
        );
        if !highlights
            .iter()
            .any(|item| item.contains(&primary_skill.name))
        {
            highlights.insert(0, summary);
        }
    }

    let mut growth_candidate: Option<(Uuid, SkillSignal)> = None;
    for card in cards {
        if let Some(skill_id) = card.skill_point_id {
            if let Some(signal) = skill_signals.get(&skill_id) {
                if growth_candidate
                    .map(|(_, current)| signal.growth_pressure() > current.growth_pressure())
                    .unwrap_or(true)
                {
                    growth_candidate = Some((skill_id, *signal));
                }
            }
        }
    }

    if let Some((skill_id, signal)) = growth_candidate {
        if let Some(entry) = skill_breakdown
            .iter()
            .find(|bucket| bucket.skill_point_id == skill_id)
        {
            let growth = (signal.growth_pressure() * 100.0).round();
            if growth >= 55.0
                && !highlights
                    .iter()
                    .any(|item| item.contains(&entry.name) && item.contains("成长"))
            {
                highlights.push(format!(
                    "技能「{}」成长压力 {:.0}% ，安排应用迁移。",
                    entry.name, growth
                ));
            }
        }
    }

    if highlights.len() > 5 {
        highlights.truncate(5);
    }

    Some(WorkoutSegmentFocus {
        headline,
        highlights,
        direction_breakdown,
        skill_breakdown,
    })
}

fn build_direction_breakdown(
    cards: &[MemoryCard],
    directions: &HashMap<Uuid, DirectionDescriptor>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    now: DateTime<Utc>,
) -> Vec<WorkoutSegmentDirectionFocus> {
    if cards.is_empty() {
        return Vec::new();
    }

    #[derive(Default)]
    struct DirectionBucket {
        count: usize,
        due_weight: f64,
        new_weight: f64,
        fail_weight: f64,
        unstable_weight: f64,
        momentum_weight: f64,
        recent_fail_pressure: f64,
        stale_weight: f64,
    }

    let mut buckets: HashMap<Uuid, DirectionBucket> = HashMap::new();

    for card in cards {
        let entry = buckets.entry(card.direction_id).or_default();
        entry.count += 1;
        entry.due_weight += due_urgency(card, now);
        entry.unstable_weight += clamp_unit(1.0 - card.stability);

        match stats_map.get(&card.id) {
            Some(stats) => {
                if stats.total_reviews() == 0 {
                    entry.new_weight += 1.0;
                }
                entry.fail_weight += (0.6 * stats.fail_rate())
                    + (0.2 * clamp_unit(stats.consecutive_fails as f64 / 3.0));
                entry.momentum_weight += clamp_unit(stats.consecutive_passes as f64 / 4.0);
                if let Some(last_fail) = stats.last_fail_at {
                    let minutes = now.signed_duration_since(last_fail).num_minutes() as f64;
                    entry.recent_fail_pressure += (1.0 - (minutes / (72.0 * 60.0))).clamp(0.0, 1.0);
                }
                entry.stale_weight += staleness_from_stats(stats, now);
            }
            None => {
                entry.new_weight += 1.0;
                entry.stale_weight += 1.0;
            }
        }
    }

    let total = cards.len() as f64;
    let mut breakdown: Vec<WorkoutSegmentDirectionFocus> = buckets
        .into_iter()
        .map(|(direction_id, bucket)| {
            let descriptor =
                directions
                    .get(&direction_id)
                    .cloned()
                    .unwrap_or(DirectionDescriptor {
                        name: "未设定方向".to_string(),
                        stage: DirectionStage::Explore,
                    });

            let average = |weight: f64| -> f64 {
                if bucket.count == 0 {
                    0.0
                } else {
                    (weight / bucket.count as f64).clamp(0.0, 1.0)
                }
            };

            let mut signals = Vec::new();
            let fail_ratio = average(bucket.fail_weight);
            if fail_ratio >= 0.45 {
                signals.push("错题压力较高".to_string());
            } else if bucket.fail_weight > 0.0 {
                signals.push("需要复习错题".to_string());
            }

            let due_ratio = average(bucket.due_weight);
            if due_ratio >= 0.5 {
                signals.push("多张卡片即将到期".to_string());
            } else if bucket.due_weight > 0.0 {
                signals.push("包含到期卡片".to_string());
            }

            let new_ratio = average(bucket.new_weight);
            if new_ratio >= 0.5 {
                signals.push("大量新卡待首轮练习".to_string());
            } else if bucket.new_weight > 0.0 {
                signals.push("含有新卡可快速上手".to_string());
            }

            let unstable_ratio = average(bucket.unstable_weight);
            if unstable_ratio >= 0.4 {
                signals.push("稳定度整体偏低".to_string());
            }

            let momentum_ratio = average(bucket.momentum_weight);
            if momentum_ratio >= 0.45 {
                signals.push("保持连对势头".to_string());
            }

            let recent_fail_ratio = average(bucket.recent_fail_pressure);
            if recent_fail_ratio >= 0.4 && fail_ratio < 0.45 {
                signals.push("近期错题需要复盘".to_string());
            }

            let stale_ratio = average(bucket.stale_weight);
            if stale_ratio >= 0.5 {
                signals.push("方向久未练，需要唤醒".to_string());
            } else if stale_ratio >= 0.3 {
                signals.push("包含久未练卡片".to_string());
            }

            if signals.len() > 3 {
                signals.truncate(3);
            }

            WorkoutSegmentDirectionFocus {
                direction_id,
                name: descriptor.name,
                stage: descriptor.stage,
                count: bucket.count,
                share: if total > 0.0 {
                    (bucket.count as f64 / total).clamp(0.0, 1.0)
                } else {
                    0.0
                },
                signals,
            }
        })
        .collect();

    breakdown.sort_by(|a, b| b.count.cmp(&a.count));
    breakdown
}

fn build_skill_breakdown(
    cards: &[MemoryCard],
    skills: &HashMap<Uuid, SkillPointDescriptor>,
    stats_map: &HashMap<Uuid, CardReviewStats>,
    now: DateTime<Utc>,
) -> Vec<WorkoutSegmentSkillFocus> {
    if cards.is_empty() {
        return Vec::new();
    }

    #[derive(Default)]
    struct SkillBucket {
        count: usize,
        due_weight: f64,
        fail_weight: f64,
        new_weight: f64,
        unstable_weight: f64,
        momentum_weight: f64,
        stale_weight: f64,
    }

    let mut buckets: HashMap<Uuid, SkillBucket> = HashMap::new();

    for card in cards {
        let Some(skill_id) = card.skill_point_id else {
            continue;
        };
        let entry = buckets.entry(skill_id).or_default();
        entry.count += 1;
        entry.due_weight += due_urgency(card, now);
        entry.unstable_weight += clamp_unit(1.0 - card.stability);

        match stats_map.get(&card.id) {
            Some(stats) => {
                if stats.total_reviews() == 0 {
                    entry.new_weight += 1.0;
                }
                entry.fail_weight += (0.6 * stats.fail_rate())
                    + (0.2 * clamp_unit(stats.consecutive_fails as f64 / 3.0));
                entry.momentum_weight += clamp_unit(stats.consecutive_passes as f64 / 4.0);
                entry.stale_weight += staleness_from_stats(stats, now);
            }
            None => {
                entry.new_weight += 1.0;
                entry.stale_weight += 1.0;
            }
        }
    }

    let total: usize = cards
        .iter()
        .filter(|card| card.skill_point_id.is_some())
        .count();

    if total == 0 {
        return Vec::new();
    }

    let mut breakdown: Vec<WorkoutSegmentSkillFocus> = buckets
        .into_iter()
        .map(|(skill_id, bucket)| {
            let descriptor = skill_descriptor(skills, skill_id);
            let average = |value: f64| -> f64 {
                if bucket.count == 0 {
                    0.0
                } else {
                    (value / bucket.count as f64).clamp(0.0, 1.0)
                }
            };

            let mut signals = Vec::new();
            signals.push(match descriptor.level {
                SkillLevel::Unknown => "掌握度未评估".to_string(),
                SkillLevel::Emerging => "处于起步阶段".to_string(),
                SkillLevel::Working => "正在攻坚阶段".to_string(),
                SkillLevel::Fluent => "接近固化阶段".to_string(),
            });

            let fail_ratio = average(bucket.fail_weight);
            if fail_ratio >= 0.45 {
                signals.push("错题压力较高".to_string());
            } else if fail_ratio >= 0.25 {
                signals.push("注意纠偏错题".to_string());
            }

            let due_ratio = average(bucket.due_weight);
            if due_ratio >= 0.5 {
                signals.push("多张卡片即将到期".to_string());
            }

            let new_ratio = average(bucket.new_weight);
            if new_ratio >= 0.4 {
                signals.push("含大量新卡待迁移".to_string());
            }

            let stale_ratio = average(bucket.stale_weight);
            if stale_ratio >= 0.45 {
                signals.push("技能久未练".to_string());
            }

            let momentum_ratio = average(bucket.momentum_weight);
            if momentum_ratio >= 0.5 {
                signals.push("保持连对势头".to_string());
            }

            if signals.len() > 3 {
                signals.truncate(3);
            }

            WorkoutSegmentSkillFocus {
                skill_point_id: skill_id,
                name: descriptor.name,
                level: descriptor.level,
                count: bucket.count,
                share: (bucket.count as f64 / total as f64).clamp(0.0, 1.0),
                signals,
            }
        })
        .collect();

    breakdown.sort_by(|a, b| {
        b.share
            .partial_cmp(&a.share)
            .unwrap_or_else(|| b.count.cmp(&a.count))
    });
    breakdown
}

fn skill_descriptor(
    skills: &HashMap<Uuid, SkillPointDescriptor>,
    skill_id: Uuid,
) -> SkillPointDescriptor {
    skills
        .get(&skill_id)
        .cloned()
        .unwrap_or(SkillPointDescriptor {
            name: "未设定技能".to_string(),
            level: SkillLevel::Unknown,
        })
}

#[derive(Debug, Clone, Copy, Default)]
struct StageBias {
    quiz: f64,
    apply: f64,
    review: f64,
}

fn stage_bias_for(
    directions: &HashMap<Uuid, DirectionDescriptor>,
    direction_id: Uuid,
) -> StageBias {
    let stage = directions
        .get(&direction_id)
        .map(|ctx| ctx.stage.clone())
        .unwrap_or(DirectionStage::Explore);
    stage_bias(stage)
}

fn stage_bias(stage: DirectionStage) -> StageBias {
    match stage {
        DirectionStage::Explore => StageBias {
            quiz: 0.08,
            apply: 0.04,
            review: 0.02,
        },
        DirectionStage::Shape => StageBias {
            quiz: 0.05,
            apply: 0.07,
            review: 0.04,
        },
        DirectionStage::Attack => StageBias {
            quiz: 0.02,
            apply: 0.1,
            review: 0.05,
        },
        DirectionStage::Stabilize => StageBias {
            quiz: 0.03,
            apply: 0.05,
            review: 0.1,
        },
    }
}

fn compute_segment_scores(
    card: &MemoryCard,
    stats: &CardReviewStats,
    now: DateTime<Utc>,
    directions: &HashMap<Uuid, DirectionDescriptor>,
    direction_signals: &HashMap<Uuid, DirectionSignal>,
    skill_signals: &HashMap<Uuid, SkillSignal>,
) -> SegmentScores {
    let priority = clamp_unit(card.priority);
    let relevance = clamp_unit(card.relevance);
    let novelty = clamp_unit(card.novelty);
    let stability_gap = clamp_unit(1.0 - card.stability);
    let due = due_urgency(card, now);
    let freshness = freshness_score(stats, now);
    let fail_rate = stats.fail_rate();
    let pass_momentum = clamp_unit(stats.consecutive_passes as f64 / 4.0);
    let fail_streak = clamp_unit(stats.consecutive_fails as f64 / 3.0);
    let new_bonus = if stats.total_reviews() == 0 { 1.0 } else { 0.0 };
    let last_fail_pressure = stats
        .last_fail_at
        .map(|last_fail| {
            let minutes = now.signed_duration_since(last_fail).num_minutes() as f64;
            (1.0 - (minutes / (72.0 * 60.0))).clamp(0.0, 1.0)
        })
        .unwrap_or(0.0);
    let stage_bias = stage_bias_for(directions, card.direction_id);
    let direction_signal = direction_signals
        .get(&card.direction_id)
        .copied()
        .unwrap_or_default();
    let skill_signal = card
        .skill_point_id
        .and_then(|skill_id| skill_signals.get(&skill_id).copied())
        .unwrap_or_default();

    let quiz = clamp_unit(
        0.3 * due
            + 0.25 * stability_gap
            + 0.15 * priority
            + 0.15 * pass_momentum
            + 0.1 * (1.0 - fail_rate)
            + 0.05 * novelty
            + 0.05 * new_bonus
            + stage_bias.quiz
            + 0.08 * direction_signal.quiz_bias()
            + 0.08 * skill_signal.quiz_bias()
            + 0.05 * skill_signal.level_gap(),
    );
    let apply = clamp_unit(
        0.4 * relevance + 0.2 * novelty + 0.15 * priority + 0.15 * pass_momentum + 0.1 * freshness
            - 0.1 * fail_rate
            + stage_bias.apply
            + 0.1 * direction_signal.apply_bias()
            + 0.1 * skill_signal.apply_bias()
            + 0.05 * skill_signal.level_gap(),
    );
    let review = clamp_unit(
        0.35 * fail_rate
            + 0.25 * fail_streak
            + 0.2 * due
            + 0.1 * last_fail_pressure
            + 0.1 * stability_gap
            + stage_bias.review
            + 0.12 * direction_signal.review_bias()
            + 0.1 * skill_signal.review_bias()
            + 0.04 * skill_signal.level_gap(),
    );
    let composite = clamp_unit(
        0.35 * priority
            + 0.25 * due
            + 0.15 * relevance
            + 0.1 * fail_streak
            + 0.1 * pass_momentum
            + 0.05 * novelty
            + 0.1 * stage_bias.apply
            + 0.05 * stage_bias.review
            + 0.05 * stage_bias.quiz
            + 0.1 * direction_signal.composite_bias()
            + 0.08 * skill_signal.growth_pressure()
            + 0.05 * skill_signal.level_gap(),
    );

    SegmentScores {
        quiz,
        apply,
        review,
        composite,
    }
}

fn due_urgency(card: &MemoryCard, now: DateTime<Utc>) -> f64 {
    match card.next_due {
        Some(due) => {
            let delta = now.signed_duration_since(due).num_minutes() as f64;
            let normalized = (delta + 24.0 * 60.0) / (48.0 * 60.0);
            clamp_unit(normalized)
        }
        None => 0.3,
    }
}

fn freshness_score(stats: &CardReviewStats, now: DateTime<Utc>) -> f64 {
    let base = match stats.last_seen {
        Some(last_seen) => {
            let minutes = now.signed_duration_since(last_seen).num_minutes();
            if minutes <= 0 {
                0.0
            } else {
                ((minutes as f64) / (7.0 * 24.0 * 60.0)).clamp(0.0, 1.0)
            }
        }
        None => 1.0,
    };

    if stats.consecutive_fails > 0 {
        (base + 0.2).clamp(0.0, 1.0)
    } else if stats.consecutive_passes >= 3 {
        (base * 0.7).clamp(0.0, 1.0)
    } else {
        base
    }
}

fn staleness_from_stats(stats: &CardReviewStats, now: DateTime<Utc>) -> f64 {
    staleness_from_last_seen(stats.last_seen, now)
}

fn staleness_from_last_seen(last_seen: Option<DateTime<Utc>>, now: DateTime<Utc>) -> f64 {
    match last_seen {
        Some(seen) => {
            let minutes = now.signed_duration_since(seen).num_minutes() as f64;
            if minutes <= 0.0 {
                0.0
            } else {
                (minutes / (5.0 * 24.0 * 60.0)).clamp(0.0, 1.0)
            }
        }
        None => 1.0,
    }
}

fn clamp_unit(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

#[derive(Debug, Clone, Copy)]
struct SegmentScores {
    quiz: f64,
    apply: f64,
    review: f64,
    composite: f64,
}

impl SegmentScores {
    fn for_phase(&self, phase: WorkoutPhase) -> f64 {
        match phase {
            WorkoutPhase::Quiz => self.quiz,
            WorkoutPhase::Apply => self.apply,
            WorkoutPhase::Review => self.review,
        }
    }
}

#[derive(sqlx::FromRow)]
struct StoredCard {
    id: String,
    title: String,
    direction_id: String,
    skill_point_id: Option<String>,
    stability: f64,
    relevance: f64,
    novelty: f64,
    priority: f64,
    next_due: Option<String>,
}

async fn fetch_card_for_update(pool: &SqlitePool, card_id: Uuid) -> AppResult<StoredCard> {
    let row = sqlx::query_as::<_, StoredCard>(
        "SELECT id, title, direction_id, skill_point_id, stability, relevance, novelty, priority, next_due FROM memory_cards WHERE id = ?",
    )
    .bind(card_id.to_string())
    .fetch_optional(pool)
    .await?;

    row.ok_or(AppError::NotFound)
}

struct CardUpdateOutcome {
    progress: WorkoutCardProgress,
    next_due: Option<DateTime<Utc>>,
    novelty: f64,
    previous_stability: f64,
    stability_delta: f64,
    direction_id: Uuid,
    skill_point_id: Option<Uuid>,
}

fn apply_result(
    card: &mut StoredCard,
    result: WorkoutResultKind,
    now: DateTime<Utc>,
) -> AppResult<CardUpdateOutcome> {
    let previous_stability = card.stability.clamp(0.0, 1.0);
    let mut stability = previous_stability;
    let relevance = card.relevance.clamp(0.0, 1.0);
    let novelty = card.novelty.clamp(0.0, 1.0);

    let next_due = match result {
        WorkoutResultKind::Pass => {
            stability = (stability + PASS_STABILITY_BOOST).clamp(0.0, 0.99);
            let factor = 1.0 - 0.5 * relevance;
            let hours = PASS_BASE_INTERVAL_HOURS * (1.0 + stability) * factor.max(0.3);
            Some(now + Duration::minutes((hours * 60.0).round() as i64))
        }
        WorkoutResultKind::Fail => {
            stability = (stability * FAIL_STABILITY_PENALTY).max(0.05);
            let factor = 1.0 - 0.5 * relevance;
            let hours = FAIL_BASE_INTERVAL_HOURS * factor.max(0.25);
            Some(now + Duration::minutes((hours * 60.0).round() as i64))
        }
    };

    let priority = calculate_priority(stability, relevance, novelty);
    let stability_delta = stability - previous_stability;

    card.stability = stability;
    card.priority = priority;
    card.next_due = next_due.map(|dt| dt.to_rfc3339());

    let card_id = Uuid::parse_str(&card.id).map_err(|err| AppError::Validation(err.to_string()))?;
    let direction_id =
        Uuid::parse_str(&card.direction_id).map_err(|err| AppError::Validation(err.to_string()))?;
    let skill_point_id = match &card.skill_point_id {
        Some(value) => {
            Some(Uuid::parse_str(value).map_err(|err| AppError::Validation(err.to_string()))?)
        }
        None => None,
    };

    Ok(CardUpdateOutcome {
        progress: WorkoutCardProgress {
            card_id,
            result,
            stability,
            priority,
            next_due,
        },
        next_due,
        novelty,
        previous_stability,
        stability_delta,
        direction_id,
        skill_point_id,
    })
}

async fn persist_card(
    pool: &SqlitePool,
    card: &StoredCard,
    updated_at: DateTime<Utc>,
) -> AppResult<()> {
    sqlx::query("UPDATE memory_cards SET stability = ?, priority = ?, next_due = ?, updated_at = ? WHERE id = ?")
        .bind(card.stability)
        .bind(card.priority)
        .bind(card.next_due.clone())
        .bind(updated_at.to_rfc3339())
        .bind(&card.id)
        .execute(pool)
        .await?;

    Ok(())
}

async fn fetch_item_card_map(
    pool: &SqlitePool,
    workout_id: Uuid,
) -> AppResult<HashMap<Uuid, Uuid>> {
    let rows = sqlx::query("SELECT id, card_id FROM workout_items WHERE workout_id = ?")
        .bind(workout_id.to_string())
        .fetch_all(pool)
        .await?;

    let mut map = HashMap::with_capacity(rows.len());
    for row in rows {
        let item_id: String = row.get("id");
        let card_id: String = row.get("card_id");
        let item_uuid =
            Uuid::parse_str(&item_id).map_err(|err| AppError::Validation(err.to_string()))?;
        let card_uuid =
            Uuid::parse_str(&card_id).map_err(|err| AppError::Validation(err.to_string()))?;
        map.insert(item_uuid, card_uuid);
    }

    Ok(map)
}
