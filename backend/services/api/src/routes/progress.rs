use std::collections::{BTreeSet, HashMap};
use std::str::FromStr;

use axum::{extract::State, routing::get, Json, Router};
use chrono::{Duration, Utc};
use serde::Serialize;
use sqlx::Row;
use uuid::Uuid;

use crate::domain::{DirectionStage, SkillLevel};
use crate::error::{AppError, AppResult};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/progress", get(get_progress))
}

#[derive(Debug, Serialize)]
struct ProgressResponse {
    totals: ProgressTotals,
    activity: ProgressActivity,
    mastery: ProgressMastery,
    retention: ProgressRetention,
    streaks: ProgressStreaks,
    applications: Vec<ProgressApplication>,
    recommendations: Vec<ProgressRecommendation>,
    momentum: ProgressMomentum,
}

#[derive(Debug, Serialize)]
struct ProgressTotals {
    total_cards: i64,
    active_directions: i64,
    due_today: i64,
    overdue: i64,
    avg_stability: f64,
}

#[derive(Debug, Serialize)]
struct ProgressActivity {
    workouts_completed_7d: i64,
    new_cards_7d: i64,
    applications_logged_7d: i64,
}

#[derive(Debug, Serialize)]
struct ProgressMastery {
    directions: Vec<DirectionMastery>,
    skill_gaps: Vec<SkillGap>,
}

#[derive(Debug, Serialize)]
struct DirectionMastery {
    id: Uuid,
    name: String,
    stage: DirectionStage,
    avg_skill_level: f64,
    card_count: i64,
    due_next_7d: i64,
    recent_pass_rate: f64,
}

#[derive(Debug, Serialize)]
struct SkillGap {
    id: Uuid,
    direction_id: Uuid,
    direction_name: String,
    name: String,
    level: SkillLevel,
    card_count: i64,
    due_next_7d: i64,
    recent_fail_rate: f64,
}

#[derive(Debug, Serialize)]
struct ProgressRetention {
    retention_7d: f64,
    retention_30d: f64,
    retention_90d: f64,
    trend: Vec<RetentionSample>,
}

#[derive(Debug, Serialize)]
struct RetentionSample {
    date: String,
    pass_rate: f64,
    total_reviews: i64,
}

#[derive(Debug, Serialize)]
struct ProgressStreaks {
    current: i64,
    longest: i64,
    last_completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProgressMomentum {
    knowledge_velocity: MomentumTrend,
    uncertainty_drop_rate: MomentumTrend,
}

#[derive(Debug, Serialize)]
struct MomentumTrend {
    average_7d: f64,
    average_30d: f64,
    recent: Vec<MomentumSample>,
}

#[derive(Debug, Serialize)]
struct MomentumSample {
    completed_at: String,
    value: f64,
}

#[derive(Debug, Serialize)]
struct ProgressRecommendation {
    headline: String,
    rationale: String,
}

#[derive(Debug, Serialize)]
struct ProgressApplication {
    id: Uuid,
    card_id: Uuid,
    direction_id: Uuid,
    direction_name: String,
    skill_point_id: Option<Uuid>,
    skill_point_name: Option<String>,
    card_title: String,
    context: String,
    noted_at: String,
    impact_score: f64,
}

async fn get_progress(State(state): State<AppState>) -> AppResult<Json<ProgressResponse>> {
    let pool = state.pool();
    let now = Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
    let today_end = today_start + Duration::days(1);
    let seven_days_ago = now - Duration::days(7);
    let seven_days_out = today_end + Duration::days(7);
    let thirty_days_ago = now - Duration::days(30);
    let ninety_days_ago = now - Duration::days(90);

    let total_cards: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM memory_cards")
        .fetch_one(pool)
        .await?;
    let active_directions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM directions")
        .fetch_one(pool)
        .await?;
    let due_today: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM memory_cards WHERE next_due IS NOT NULL AND next_due <= ?",
    )
    .bind(today_end.to_rfc3339())
    .fetch_one(pool)
    .await?;
    let overdue: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM memory_cards WHERE next_due IS NOT NULL AND next_due < ?",
    )
    .bind(now.to_rfc3339())
    .fetch_one(pool)
    .await?;
    let avg_stability: Option<f64> = sqlx::query_scalar("SELECT AVG(stability) FROM memory_cards")
        .fetch_one(pool)
        .await?;

    let workouts_completed_7d: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM workouts WHERE status = 'completed' AND completed_at >= ?",
    )
    .bind(seven_days_ago.to_rfc3339())
    .fetch_one(pool)
    .await?;
    let new_cards_7d: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM memory_cards WHERE created_at >= ?")
            .bind(seven_days_ago.to_rfc3339())
            .fetch_one(pool)
            .await?;
    let applications_logged_7d: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM card_applications WHERE noted_at >= ?")
            .bind(seven_days_ago.to_rfc3339())
            .fetch_one(pool)
            .await?;

    let direction_rows = sqlx::query(
        "SELECT d.id AS direction_id, d.name AS direction_name, d.stage AS stage, \
                COALESCE(AVG(sp.level), 0) AS avg_skill_level, \
                COUNT(DISTINCT mc.id) AS card_count, \
                SUM(CASE WHEN mc.next_due IS NOT NULL AND mc.next_due <= ? THEN 1 ELSE 0 END) AS due_next_7d \
         FROM directions d \
         LEFT JOIN skill_points sp ON sp.direction_id = d.id \
         LEFT JOIN memory_cards mc ON mc.direction_id = d.id \
         GROUP BY d.id, d.name, d.stage",
    )
    .bind(seven_days_out.to_rfc3339())
    .fetch_all(pool)
    .await?;

    let direction_pass_rows = sqlx::query(
        "SELECT mc.direction_id AS direction_id, \
                SUM(CASE WHEN wi.result = 'pass' THEN 1 ELSE 0 END) AS pass_count, \
                COUNT(*) AS total_count \
         FROM workout_items wi \
         JOIN workouts w ON wi.workout_id = w.id \
         JOIN memory_cards mc ON mc.id = wi.card_id \
         WHERE wi.result IS NOT NULL AND w.status = 'completed' AND w.completed_at >= ? \
         GROUP BY mc.direction_id",
    )
    .bind(thirty_days_ago.to_rfc3339())
    .fetch_all(pool)
    .await?;

    let mut direction_pass_map: HashMap<Uuid, (i64, i64)> = HashMap::new();
    for row in direction_pass_rows {
        let direction_id = parse_uuid(row.get::<String, _>("direction_id"))?;
        let pass_count: i64 = row.get("pass_count");
        let total_count: i64 = row.get("total_count");
        direction_pass_map.insert(direction_id, (pass_count, total_count));
    }

    let mut direction_mastery = Vec::with_capacity(direction_rows.len());
    for row in direction_rows {
        let id = parse_uuid(row.get::<String, _>("direction_id"))?;
        let stage_raw: String = row.get("stage");
        let stage = DirectionStage::from_str(&stage_raw)
            .map_err(|err| AppError::Validation(err.to_string()))?;
        let avg_skill_level: f64 = row.get::<Option<f64>, _>("avg_skill_level").unwrap_or(0.0);
        let card_count: i64 = row.get("card_count");
        let due_next_7d: i64 = row.get::<Option<i64>, _>("due_next_7d").unwrap_or(0);

        let recent = direction_pass_map.get(&id).copied().unwrap_or_default();
        let recent_pass_rate = if recent.1 > 0 {
            recent.0 as f64 / recent.1 as f64
        } else {
            0.0
        };

        direction_mastery.push(DirectionMastery {
            id,
            name: row.get("direction_name"),
            stage,
            avg_skill_level,
            card_count,
            due_next_7d,
            recent_pass_rate,
        });
    }

    direction_mastery.sort_by(|a, b| {
        b.due_next_7d.cmp(&a.due_next_7d).then_with(|| {
            a.recent_pass_rate
                .partial_cmp(&b.recent_pass_rate)
                .unwrap_or(std::cmp::Ordering::Equal)
                .reverse()
        })
    });

    let skill_rows = sqlx::query(
        "SELECT sp.id AS skill_id, sp.direction_id AS direction_id, sp.name AS skill_name, sp.level AS level, \
                d.name AS direction_name, \
                COUNT(DISTINCT mc.id) AS card_count, \
                SUM(CASE WHEN mc.next_due IS NOT NULL AND mc.next_due <= ? THEN 1 ELSE 0 END) AS due_next_7d \
         FROM skill_points sp \
         JOIN directions d ON sp.direction_id = d.id \
         LEFT JOIN memory_cards mc ON mc.skill_point_id = sp.id \
         GROUP BY sp.id, sp.direction_id, sp.name, sp.level, d.name",
    )
    .bind(seven_days_out.to_rfc3339())
    .fetch_all(pool)
    .await?;

    let skill_fail_rows = sqlx::query(
        "SELECT mc.skill_point_id AS skill_point_id, \
                SUM(CASE WHEN wi.result = 'fail' THEN 1 ELSE 0 END) AS fail_count, \
                COUNT(*) AS total_count \
         FROM workout_items wi \
         JOIN workouts w ON wi.workout_id = w.id \
         JOIN memory_cards mc ON mc.id = wi.card_id \
         WHERE wi.result IS NOT NULL AND w.status = 'completed' AND w.completed_at >= ? AND mc.skill_point_id IS NOT NULL \
         GROUP BY mc.skill_point_id",
    )
    .bind(thirty_days_ago.to_rfc3339())
    .fetch_all(pool)
    .await?;

    let mut skill_fail_map: HashMap<Uuid, (i64, i64)> = HashMap::new();
    for row in skill_fail_rows {
        let skill_point_id = parse_uuid(row.get::<String, _>("skill_point_id"))?;
        let fail_count: i64 = row.get("fail_count");
        let total_count: i64 = row.get("total_count");
        skill_fail_map.insert(skill_point_id, (fail_count, total_count));
    }

    let mut skill_gaps = Vec::with_capacity(skill_rows.len());
    for row in skill_rows {
        let id = parse_uuid(row.get::<String, _>("skill_id"))?;
        let direction_id = parse_uuid(row.get::<String, _>("direction_id"))?;
        let level_value: i64 = row.get("level");
        let level = SkillLevel::clamp(level_value as i32);
        let card_count: i64 = row.get("card_count");
        let due_next_7d: i64 = row.get::<Option<i64>, _>("due_next_7d").unwrap_or(0);

        let recent = skill_fail_map.get(&id).copied().unwrap_or_default();
        let recent_fail_rate = if recent.1 > 0 {
            recent.0 as f64 / recent.1 as f64
        } else {
            0.0
        };

        skill_gaps.push(SkillGap {
            id,
            direction_id,
            direction_name: row.get("direction_name"),
            name: row.get("skill_name"),
            level,
            card_count,
            due_next_7d,
            recent_fail_rate,
        });
    }

    skill_gaps.sort_by(|a, b| {
        a.level
            .as_i32()
            .cmp(&b.level.as_i32())
            .then(b.due_next_7d.cmp(&a.due_next_7d))
            .then_with(|| {
                b.recent_fail_rate
                    .partial_cmp(&a.recent_fail_rate)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
    });
    skill_gaps.truncate(6);

    let completion_rows = sqlx::query(
        "SELECT wi.result AS result, w.completed_at AS completed_at \
         FROM workout_items wi \
         JOIN workouts w ON wi.workout_id = w.id \
         WHERE wi.result IS NOT NULL AND w.status = 'completed' AND w.completed_at >= ?",
    )
    .bind(ninety_days_ago.to_rfc3339())
    .fetch_all(pool)
    .await?;

    let mut retention_counts = RetentionBuckets::default();
    let mut daily_completion: HashMap<chrono::NaiveDate, (i64, i64)> = HashMap::new();
    let mut completion_days: BTreeSet<_> = BTreeSet::new();
    let mut last_completed_at: Option<String> = None;

    for row in completion_rows {
        let result: String = row.get("result");
        let completed_at: String = row.get("completed_at");
        let completed = parse_time(&completed_at)?;

        let diff = now - completed;
        let is_pass = result == "pass";

        retention_counts.add_sample(diff, is_pass);

        let day = completed.date_naive();
        let entry = daily_completion.entry(day).or_insert((0, 0));
        if is_pass {
            entry.0 += 1;
        }
        entry.1 += 1;

        completion_days.insert(completed.date_naive());
        if last_completed_at
            .as_ref()
            .map_or(true, |existing| completed_at > *existing)
        {
            last_completed_at = Some(completed_at);
        }
    }

    let mut trend: Vec<(chrono::NaiveDate, RetentionSample)> = daily_completion
        .into_iter()
        .map(|(day, (passes, total))| {
            let pass_rate = if total > 0 {
                passes as f64 / total as f64
            } else {
                0.0
            };
            (
                day,
                RetentionSample {
                    date: day.format("%Y-%m-%d").to_string(),
                    pass_rate,
                    total_reviews: total,
                },
            )
        })
        .collect();

    trend.sort_by(|a, b| b.0.cmp(&a.0));
    let trend = trend
        .into_iter()
        .map(|(_, sample)| sample)
        .take(14)
        .collect();

    let retention = ProgressRetention {
        retention_7d: retention_counts.ratio_7d(),
        retention_30d: retention_counts.ratio_30d(),
        retention_90d: retention_counts.ratio_90d(),
        trend,
    };

    let streaks = ProgressStreaks {
        current: calculate_current_streak(&completion_days, now.date_naive()),
        longest: calculate_longest_streak(&completion_days),
        last_completed_at,
    };

    let mastery = ProgressMastery {
        directions: direction_mastery,
        skill_gaps,
    };

    let application_rows = sqlx::query(
        "SELECT a.id            AS application_id, \
                a.card_id      AS card_id, \
                a.context      AS context, \
                a.noted_at     AS noted_at, \
                mc.title       AS card_title, \
                mc.priority    AS card_priority, \
                mc.stability   AS card_stability, \
                mc.direction_id AS direction_id, \
                d.name         AS direction_name, \
                mc.skill_point_id AS skill_point_id, \
                sp.name        AS skill_point_name \
         FROM card_applications a \
         JOIN memory_cards mc ON mc.id = a.card_id \
         JOIN directions d ON d.id = mc.direction_id \
         LEFT JOIN skill_points sp ON sp.id = mc.skill_point_id \
         ORDER BY a.noted_at DESC \
         LIMIT 8",
    )
    .fetch_all(pool)
    .await?;

    let mut applications = Vec::with_capacity(application_rows.len());
    for row in application_rows {
        let id = parse_uuid(row.get::<String, _>("application_id"))?;
        let card_id = parse_uuid(row.get::<String, _>("card_id"))?;
        let direction_id = parse_uuid(row.get::<String, _>("direction_id"))?;
        let skill_point_id = row
            .get::<Option<String>, _>("skill_point_id")
            .map(parse_uuid)
            .transpose()?;

        let priority: f64 = row.get("card_priority");
        let stability: f64 = row.get("card_stability");
        let impact_score = calculate_application_impact(priority, stability);

        applications.push(ProgressApplication {
            id,
            card_id,
            direction_id,
            direction_name: row.get("direction_name"),
            skill_point_id,
            skill_point_name: row.get("skill_point_name"),
            card_title: row.get("card_title"),
            context: row.get("context"),
            noted_at: row.get("noted_at"),
            impact_score,
        });
    }

    let momentum_rows = sqlx::query(
        "SELECT completed_at, kv_delta, udr FROM workout_summaries ORDER BY completed_at DESC LIMIT 30",
    )
    .fetch_all(pool)
    .await?;

    let mut kv_recent = Vec::new();
    let mut udr_recent = Vec::new();
    let mut kv_sum_7d = 0.0;
    let mut kv_count_7d = 0usize;
    let mut kv_sum_30d = 0.0;
    let mut kv_count_30d = 0usize;
    let mut udr_sum_7d = 0.0;
    let mut udr_count_7d = 0usize;
    let mut udr_sum_30d = 0.0;
    let mut udr_count_30d = 0usize;

    for row in momentum_rows {
        let completed_at: String = row.get("completed_at");
        let kv_delta: f64 = row.get("kv_delta");
        let udr: f64 = row.get("udr");
        let completed = parse_time(&completed_at)?;

        if completed >= now - Duration::days(7) {
            kv_sum_7d += kv_delta;
            kv_count_7d += 1;
            udr_sum_7d += udr;
            udr_count_7d += 1;
        }

        if completed >= now - Duration::days(30) {
            kv_sum_30d += kv_delta;
            kv_count_30d += 1;
            udr_sum_30d += udr;
            udr_count_30d += 1;
        }

        if kv_recent.len() < 10 {
            kv_recent.push(MomentumSample {
                completed_at: completed_at.clone(),
                value: kv_delta,
            });
        }

        if udr_recent.len() < 10 {
            udr_recent.push(MomentumSample {
                completed_at,
                value: udr,
            });
        }
    }

    let momentum = ProgressMomentum {
        knowledge_velocity: MomentumTrend {
            average_7d: average(kv_sum_7d, kv_count_7d),
            average_30d: average(kv_sum_30d, kv_count_30d),
            recent: kv_recent,
        },
        uncertainty_drop_rate: MomentumTrend {
            average_7d: average(udr_sum_7d, udr_count_7d),
            average_30d: average(udr_sum_30d, udr_count_30d),
            recent: udr_recent,
        },
    };

    let recommendations = derive_recommendations(&mastery, &retention, &streaks);

    Ok(Json(ProgressResponse {
        totals: ProgressTotals {
            total_cards,
            active_directions,
            due_today,
            overdue,
            avg_stability: avg_stability.unwrap_or_default(),
        },
        activity: ProgressActivity {
            workouts_completed_7d,
            new_cards_7d,
            applications_logged_7d,
        },
        mastery,
        retention,
        streaks,
        applications,
        recommendations,
        momentum,
    }))
}

#[derive(Default)]
struct RetentionBuckets {
    total_7d: i64,
    pass_7d: i64,
    total_30d: i64,
    pass_30d: i64,
    total_90d: i64,
    pass_90d: i64,
}

impl RetentionBuckets {
    fn add_sample(&mut self, diff: Duration, is_pass: bool) {
        if diff <= Duration::days(90) {
            self.total_90d += 1;
            if is_pass {
                self.pass_90d += 1;
            }
        }

        if diff <= Duration::days(30) {
            self.total_30d += 1;
            if is_pass {
                self.pass_30d += 1;
            }
        }

        if diff <= Duration::days(7) {
            self.total_7d += 1;
            if is_pass {
                self.pass_7d += 1;
            }
        }
    }

    fn ratio(total: i64, pass: i64) -> f64 {
        if total > 0 {
            pass as f64 / total as f64
        } else {
            0.0
        }
    }

    fn ratio_7d(&self) -> f64 {
        Self::ratio(self.total_7d, self.pass_7d)
    }

    fn ratio_30d(&self) -> f64 {
        Self::ratio(self.total_30d, self.pass_30d)
    }

    fn ratio_90d(&self) -> f64 {
        Self::ratio(self.total_90d, self.pass_90d)
    }
}

fn calculate_current_streak(days: &BTreeSet<chrono::NaiveDate>, today: chrono::NaiveDate) -> i64 {
    let mut streak = 0;
    let mut cursor = today;

    while days.contains(&cursor) {
        streak += 1;
        cursor = cursor - chrono::Duration::days(1);
    }

    streak
}

fn calculate_longest_streak(days: &BTreeSet<chrono::NaiveDate>) -> i64 {
    let mut longest = 0;
    let mut current = 0;
    let mut prev: Option<chrono::NaiveDate> = None;

    for day in days.iter().copied() {
        if let Some(prev_day) = prev {
            if day == prev_day + chrono::Duration::days(1) {
                current += 1;
            } else {
                current = 1;
            }
        } else {
            current = 1;
        }

        longest = longest.max(current);
        prev = Some(day);
    }

    longest
}

fn average(sum: f64, count: usize) -> f64 {
    if count > 0 {
        sum / count as f64
    } else {
        0.0
    }
}

fn derive_recommendations(
    mastery: &ProgressMastery,
    retention: &ProgressRetention,
    streaks: &ProgressStreaks,
) -> Vec<ProgressRecommendation> {
    let mut notes = Vec::new();

    if let Some(direction) = mastery
        .directions
        .iter()
        .find(|dir| dir.due_next_7d > 0 && dir.recent_pass_rate < 0.8)
    {
        notes.push(ProgressRecommendation {
            headline: format!("优先清理 {} 的待复习", direction.name),
            rationale: format!(
                "未来 7 天有 {} 张卡片到期，最近 30 天通过率仅 {:.0}%",
                direction.due_next_7d,
                direction.recent_pass_rate * 100.0
            ),
        });
    }

    if let Some(skill) = mastery
        .skill_gaps
        .iter()
        .find(|skill| matches!(skill.level, SkillLevel::Unknown | SkillLevel::Emerging))
    {
        notes.push(ProgressRecommendation {
            headline: format!("针对 {} 设计一次应用演练", skill.name),
            rationale: format!(
                "当前水平为 {}，未来 7 天有 {} 张卡片到期",
                skill.level.as_str(),
                skill.due_next_7d
            ),
        });
    }

    if retention.retention_7d < 0.85 {
        notes.push(ProgressRecommendation {
            headline: "增加复盘频率以稳住记忆保持".to_string(),
            rationale: format!(
                "最近 7 天的通过率 {:.0}% 低于目标的 85%",
                retention.retention_7d * 100.0
            ),
        });
    }

    if streaks.current < 3 && streaks.longest >= 5 {
        notes.push(ProgressRecommendation {
            headline: "重启训练连胜，保持节奏".to_string(),
            rationale: format!(
                "当前连续训练 {} 天，最佳纪录 {} 天",
                streaks.current, streaks.longest
            ),
        });
    }

    notes.truncate(3);
    notes
}

fn parse_uuid(value: String) -> AppResult<Uuid> {
    Uuid::parse_str(&value).map_err(|err| AppError::Validation(err.to_string()))
}

fn parse_time(value: &str) -> AppResult<chrono::DateTime<Utc>> {
    Ok(chrono::DateTime::parse_from_rfc3339(value)
        .map_err(|err| AppError::Validation(err.to_string()))?
        .with_timezone(&Utc))
}

fn calculate_application_impact(priority: f64, stability: f64) -> f64 {
    let normalized_priority = priority.clamp(0.0, 1.0);
    let normalized_instability = (1.0 - stability).clamp(0.0, 1.0);
    let blended = (normalized_priority * 0.65) + (normalized_instability * 0.35);
    (blended * 100.0).round() / 100.0
}
