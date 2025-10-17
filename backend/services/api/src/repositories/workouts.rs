use std::collections::HashMap;

use anyhow::Context;
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{TodayWorkoutPlan, WorkoutStatus, WorkoutSummaryMetrics};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct WorkoutRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> WorkoutRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn latest_pending_for_day(
        &self,
        day: DateTime<Utc>,
    ) -> AppResult<Option<TodayWorkoutPlan>> {
        let payload = sqlx::query(
            "SELECT payload FROM workouts WHERE status = ? AND DATE(scheduled_for) = DATE(?) ORDER BY created_at DESC LIMIT 1",
        )
        .bind(WorkoutStatus::Pending.as_str())
        .bind(day.to_rfc3339())
        .fetch_optional(self.pool)
        .await?;

        match payload {
            Some(row) => {
                let payload: String = row.get("payload");
                let plan: TodayWorkoutPlan = serde_json::from_str(&payload)
                    .context("failed to deserialize workout payload")
                    .map_err(|err| AppError::Other(err.to_string()))?;
                Ok(Some(plan))
            }
            None => Ok(None),
        }
    }

    pub async fn create_today_workout(&self, plan: &TodayWorkoutPlan) -> AppResult<()> {
        let mut tx = self.pool.begin().await?;

        let payload = serde_json::to_string(plan)
            .context("failed to serialize workout payload")
            .map_err(|err| AppError::Other(err.to_string()))?;

        sqlx::query("INSERT INTO workouts (id, scheduled_for, completed_at, status, payload, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, ?)")
            .bind(plan.workout_id.to_string())
            .bind(plan.scheduled_for.to_rfc3339())
            .bind(WorkoutStatus::Pending.as_str())
            .bind(payload)
            .bind(plan.generated_at.to_rfc3339())
            .bind(plan.generated_at.to_rfc3339())
            .execute(&mut *tx)
            .await?;

        for segment in &plan.segments {
            for item in &segment.items {
                sqlx::query("INSERT INTO workout_items (id, workout_id, card_id, sequence, phase, result, due_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)")
                    .bind(item.item_id.to_string())
                    .bind(plan.workout_id.to_string())
                    .bind(item.card.id.to_string())
                    .bind(i64::from(item.sequence))
                    .bind(segment.phase.as_str())
                    .bind(item.card.next_due.map(|d| d.to_rfc3339()))
                    .bind(plan.generated_at.to_rfc3339())
                    .execute(&mut *tx)
                    .await?;
            }
        }

        tx.commit().await?;

        Ok(())
    }

    pub async fn ensure_pending(&self, workout_id: Uuid) -> AppResult<()> {
        let row = sqlx::query("SELECT status FROM workouts WHERE id = ?")
            .bind(workout_id.to_string())
            .fetch_optional(self.pool)
            .await?;

        let Some(row) = row else {
            return Err(AppError::NotFound);
        };

        let status: String = row.get("status");
        if status != WorkoutStatus::Pending.as_str() {
            return Err(AppError::Validation(
                "workout already completed".to_string(),
            ));
        }

        Ok(())
    }

    pub async fn append_result_to_payload(
        &self,
        workout_id: Uuid,
        payload_updates: &HashMap<Uuid, Value>,
    ) -> AppResult<()> {
        let row = sqlx::query("SELECT payload FROM workouts WHERE id = ?")
            .bind(workout_id.to_string())
            .fetch_one(self.pool)
            .await?;
        let payload: String = row.get("payload");
        let mut plan: Value = serde_json::from_str(&payload)
            .context("failed to decode stored workout plan")
            .map_err(|err| AppError::Other(err.to_string()))?;

        if let Some(segments) = plan.get_mut("segments").and_then(Value::as_array_mut) {
            for segment in segments {
                if let Some(items) = segment.get_mut("items").and_then(Value::as_array_mut) {
                    for item in items {
                        if let Some(id) = item.get("item_id").and_then(Value::as_str) {
                            if let Ok(item_uuid) = Uuid::parse_str(id) {
                                if let Some(update) = payload_updates.get(&item_uuid) {
                                    item["result"] = update.clone();
                                }
                            }
                        }
                    }
                }
            }
        }

        let updated = serde_json::to_string(&plan)
            .context("failed to encode updated workout payload")
            .map_err(|err| AppError::Other(err.to_string()))?;

        sqlx::query("UPDATE workouts SET payload = ? WHERE id = ?")
            .bind(updated)
            .bind(workout_id.to_string())
            .execute(self.pool)
            .await?;

        Ok(())
    }

    pub async fn record_summary(
        &self,
        workout_id: Uuid,
        completed_at: DateTime<Utc>,
        metrics: &WorkoutSummaryMetrics,
    ) -> AppResult<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO workout_summaries (workout_id, completed_at, total_items, pass_rate, kv_delta, udr, created_at, updated_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(workout_id) DO UPDATE SET \
                 completed_at = excluded.completed_at, \
                 total_items = excluded.total_items, \
                 pass_rate = excluded.pass_rate, \
                 kv_delta = excluded.kv_delta, \
                 udr = excluded.udr, \
                 updated_at = excluded.updated_at",
        )
        .bind(workout_id.to_string())
        .bind(completed_at.to_rfc3339())
        .bind(metrics.total_items as i64)
        .bind(metrics.pass_rate)
        .bind(metrics.kv_delta)
        .bind(metrics.udr)
        .bind(completed_at.to_rfc3339())
        .bind(now)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    pub async fn has_any_cards(&self) -> AppResult<bool> {
        let row = sqlx::query("SELECT EXISTS(SELECT 1 FROM memory_cards) AS present")
            .fetch_one(self.pool)
            .await?;
        let present: i64 = row.get("present");
        Ok(present == 1)
    }
}
