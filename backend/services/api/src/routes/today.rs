use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::{TodayWorkoutPlan, WorkoutCompletionSummary, WorkoutResultKind};
use crate::error::{AppError, AppResult};
use crate::services::today::{TodayScheduler, WorkoutItemResultInput};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/today", get(get_today_workout))
        .route("/api/workouts/:id/done", post(complete_workout))
}

#[derive(Debug, Serialize)]
struct TodayResponse {
    workout: Option<TodayWorkoutPlan>,
}

async fn get_today_workout(State(state): State<AppState>) -> AppResult<Json<TodayResponse>> {
    let scheduler = TodayScheduler::new(state.pool());
    let plan = scheduler.get_or_schedule().await?;

    Ok(Json(TodayResponse { workout: plan }))
}

#[derive(Debug, Deserialize)]
struct CompleteWorkoutRequest {
    results: Vec<WorkoutResultInput>,
}

#[derive(Debug, Deserialize)]
struct WorkoutResultInput {
    item_id: Uuid,
    result: WorkoutResultKind,
}

#[derive(Debug, Serialize)]
struct CompleteWorkoutResponse {
    summary: WorkoutCompletionSummary,
}

async fn complete_workout(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CompleteWorkoutRequest>,
) -> AppResult<Json<CompleteWorkoutResponse>> {
    if payload.results.is_empty() {
        return Err(AppError::Validation("results cannot be empty".to_string()));
    }

    let scheduler = TodayScheduler::new(state.pool());
    let inputs = payload
        .results
        .into_iter()
        .map(|item| WorkoutItemResultInput {
            item_id: item.item_id,
            result: item.result,
        })
        .collect();

    let summary = scheduler.complete_workout(id, inputs).await?;

    Ok(Json(CompleteWorkoutResponse { summary }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn deserialize_result_kind() {
        let payload = json!({
            "item_id": Uuid::nil(),
            "result": "pass",
        });
        let parsed: WorkoutResultInput = serde_json::from_value(payload).unwrap();
        assert_eq!(parsed.result, WorkoutResultKind::Pass);
    }
}
