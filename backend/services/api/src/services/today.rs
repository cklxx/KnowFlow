use std::collections::HashMap;

use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;
use sqlx::{Row, SqlitePool};
use tracing::instrument;
use uuid::Uuid;

use crate::domain::memory_card::calculate_priority;
use crate::domain::{
    MemoryCard, TodayWorkoutPlan, WorkoutCardProgress, WorkoutCompletionSummary, WorkoutItemPlan,
    WorkoutPhase, WorkoutResultKind, WorkoutSegmentPlan, WorkoutStatus, WorkoutTotals,
};
use crate::error::{AppError, AppResult};
use crate::repositories::memory_cards::MemoryCardRepository;
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
        let cards = card_repo.list_for_today(now, MAX_TODAY_CARDS).await?;

        if cards.is_empty() {
            return Ok(None);
        }

        let plan = build_plan(now, cards);
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

        let map = fetch_item_card_map(self.pool, workout_id).await?;

        let now = Utc::now();
        let mut payload_updates = HashMap::new();
        let mut progress = Vec::new();

        for input in inputs {
            let Some(&card_id) = map.get(&input.item_id) else {
                return Err(AppError::Validation(format!(
                    "unknown workout item {}",
                    input.item_id
                )));
            };

            let mut card_record = fetch_card_for_update(self.pool, card_id).await?;
            let CardUpdateOutcome {
                progress: card_progress,
                stability,
                priority,
                next_due,
            } = apply_result(&mut card_record, input.result, now)?;

            persist_card(self.pool, &card_record, now).await?;

            payload_updates.insert(
                input.item_id,
                serde_json::json!({
                    "result": card_progress.result.as_str(),
                    "next_due": next_due.map(|dt| dt.to_rfc3339()),
                    "stability": stability,
                    "priority": priority,
                }),
            );
            progress.push(card_progress);

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

        Ok(WorkoutCompletionSummary {
            workout_id,
            completed_at: now,
            updates: progress,
        })
    }
}

fn build_plan(now: DateTime<Utc>, cards: Vec<MemoryCard>) -> TodayWorkoutPlan {
    let workout_id = Uuid::new_v4();
    let scheduled_for = now;
    let generated_at = now;

    let mut totals = WorkoutTotals::default();
    let mut segments = Vec::new();
    let mut remaining = cards;

    let quiz = take_segment(&mut remaining, WorkoutPhase::Quiz, QUIZ_TARGET, &mut totals);
    if !quiz.items.is_empty() {
        segments.push(quiz);
    }

    let apply = take_segment(
        &mut remaining,
        WorkoutPhase::Apply,
        APPLY_TARGET,
        &mut totals,
    );
    if !apply.items.is_empty() {
        segments.push(apply);
    }

    let review = take_segment(
        &mut remaining,
        WorkoutPhase::Review,
        REVIEW_TARGET,
        &mut totals,
    );
    if !review.items.is_empty() {
        segments.push(review);
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

fn take_segment(
    cards: &mut Vec<MemoryCard>,
    phase: WorkoutPhase,
    target: usize,
    totals: &mut WorkoutTotals,
) -> WorkoutSegmentPlan {
    let count = target.min(cards.len());
    let mut items = Vec::with_capacity(count);

    for (idx, card) in cards.drain(0..count).enumerate() {
        let item = WorkoutItemPlan {
            item_id: Uuid::new_v4(),
            sequence: idx as u32,
            card,
        };
        items.push(item);
    }

    match phase {
        WorkoutPhase::Quiz => totals.quiz += items.len(),
        WorkoutPhase::Apply => totals.apply += items.len(),
        WorkoutPhase::Review => totals.review += items.len(),
    }

    WorkoutSegmentPlan { phase, items }
}

#[derive(sqlx::FromRow)]
struct StoredCard {
    id: String,
    stability: f64,
    relevance: f64,
    novelty: f64,
    priority: f64,
    next_due: Option<String>,
}

async fn fetch_card_for_update(pool: &SqlitePool, card_id: Uuid) -> AppResult<StoredCard> {
    let row = sqlx::query_as::<_, StoredCard>(
        "SELECT id, stability, relevance, novelty, priority, next_due FROM memory_cards WHERE id = ?",
    )
    .bind(card_id.to_string())
    .fetch_optional(pool)
    .await?;

    row.ok_or(AppError::NotFound)
}

struct CardUpdateOutcome {
    progress: WorkoutCardProgress,
    stability: f64,
    priority: f64,
    next_due: Option<DateTime<Utc>>,
}

fn apply_result(
    card: &mut StoredCard,
    result: WorkoutResultKind,
    now: DateTime<Utc>,
) -> AppResult<CardUpdateOutcome> {
    let mut stability = card.stability.clamp(0.0, 1.0);
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

    card.stability = stability;
    card.priority = priority;
    card.next_due = next_due.map(|dt| dt.to_rfc3339());

    let card_id = Uuid::parse_str(&card.id).map_err(|err| AppError::Validation(err.to_string()))?;

    Ok(CardUpdateOutcome {
        progress: WorkoutCardProgress {
            card_id,
            result,
            stability,
            priority,
            next_due,
        },
        stability,
        priority,
        next_due,
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
