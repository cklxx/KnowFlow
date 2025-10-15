use axum::{extract::State, routing::get, Json, Router};
use chrono::{Duration, Utc};
use serde::Serialize;

use crate::error::AppResult;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/progress", get(get_progress))
}

#[derive(Debug, Serialize)]
struct ProgressResponse {
    totals: ProgressTotals,
    activity: ProgressActivity,
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

async fn get_progress(State(state): State<AppState>) -> AppResult<Json<ProgressResponse>> {
    let pool = state.pool();
    let now = Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
    let today_end = today_start + Duration::days(1);
    let seven_days_ago = now - Duration::days(7);

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
    }))
}
