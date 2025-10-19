use std::str::FromStr;

use axum::{
    extract::State,
    routing::{get, put},
    Json, Router,
};
use chrono::{NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};

use crate::error::{AppError, AppResult};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/settings/summary", get(get_settings_summary))
        .route("/api/settings/export", get(get_settings_export))
        .route(
            "/api/settings/notifications",
            get(get_notification_preferences).put(update_notification_preferences),
        )
}

#[derive(Debug, Serialize)]
struct SettingsSummaryResponse {
    data_path: Option<String>,
    database_size_bytes: i64,
    direction_count: i64,
    skill_point_count: i64,
    card_count: i64,
    evidence_count: i64,
    workout_count: i64,
    last_workout_completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct SettingsExportResponse {
    directions: Vec<SettingsDirectionExport>,
    skill_points: Vec<SettingsSkillPointExport>,
    cards: Vec<SettingsCardExport>,
    evidence: Vec<SettingsEvidenceExport>,
    card_tags: Vec<SettingsCardTagExport>,
    workouts: Vec<SettingsWorkoutExport>,
    workout_items: Vec<SettingsWorkoutItemExport>,
    applications: Vec<SettingsCardApplicationExport>,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsDirectionExport {
    id: String,
    name: String,
    stage: String,
    quarterly_goal: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsSkillPointExport {
    id: String,
    direction_id: String,
    name: String,
    summary: Option<String>,
    level: i64,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsCardExport {
    id: String,
    direction_id: String,
    skill_point_id: Option<String>,
    title: String,
    body: String,
    card_type: String,
    stability: f64,
    relevance: f64,
    novelty: f64,
    priority: f64,
    next_due: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsEvidenceExport {
    id: String,
    card_id: String,
    source_type: String,
    source_uri: Option<String>,
    excerpt: Option<String>,
    credibility: i64,
    created_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsCardTagExport {
    card_id: String,
    tag: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsWorkoutExport {
    id: String,
    scheduled_for: String,
    completed_at: Option<String>,
    status: String,
    payload: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsWorkoutItemExport {
    id: String,
    workout_id: String,
    card_id: String,
    sequence: i64,
    phase: String,
    result: Option<String>,
    due_at: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct SettingsCardApplicationExport {
    id: String,
    card_id: String,
    context: String,
    noted_at: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum NotificationTarget {
    Today,
    Quiz,
    Review,
}

impl NotificationTarget {
    fn as_str(&self) -> &'static str {
        match self {
            NotificationTarget::Today => "today",
            NotificationTarget::Quiz => "quiz",
            NotificationTarget::Review => "review",
        }
    }
}

impl FromStr for NotificationTarget {
    type Err = AppError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "today" => Ok(NotificationTarget::Today),
            "quiz" => Ok(NotificationTarget::Quiz),
            "review" => Ok(NotificationTarget::Review),
            other => Err(AppError::Validation(format!(
                "unsupported notification target: {}",
                other
            ))),
        }
    }
}

#[derive(Debug, Serialize)]
struct NotificationPreferencesResponse {
    daily_reminder_enabled: bool,
    daily_reminder_time: String,
    daily_reminder_target: NotificationTarget,
    due_reminder_enabled: bool,
    due_reminder_time: String,
    due_reminder_target: NotificationTarget,
    remind_before_due_minutes: i64,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct UpdateNotificationPreferencesRequest {
    daily_reminder_enabled: bool,
    daily_reminder_time: String,
    daily_reminder_target: NotificationTarget,
    due_reminder_enabled: bool,
    due_reminder_time: String,
    due_reminder_target: NotificationTarget,
    remind_before_due_minutes: i64,
}

#[derive(Debug, FromRow)]
struct NotificationPreferencesRow {
    daily_reminder_enabled: i64,
    daily_reminder_time: String,
    daily_reminder_target: String,
    due_reminder_enabled: i64,
    due_reminder_time: String,
    due_reminder_target: String,
    remind_before_due_minutes: i64,
    updated_at: String,
}

async fn get_settings_summary(
    State(state): State<AppState>,
) -> AppResult<Json<SettingsSummaryResponse>> {
    let pool = state.pool();

    let database_entries = sqlx::query("PRAGMA database_list").fetch_all(pool).await?;

    let data_path = database_entries.into_iter().find_map(|row| {
        let name: String = row.get("name");
        if name == "main" {
            let file: Option<String> = row.get("file");
            file.filter(|value| !value.is_empty())
        } else {
            None
        }
    });

    let page_count: i64 = sqlx::query_scalar("PRAGMA page_count")
        .fetch_one(pool)
        .await?;
    let page_size: i64 = sqlx::query_scalar("PRAGMA page_size")
        .fetch_one(pool)
        .await?;
    let database_size_bytes = page_count * page_size;

    let counts_row = sqlx::query(
        r#"
SELECT
    (SELECT COUNT(*) FROM directions) AS direction_count,
    (SELECT COUNT(*) FROM skill_points) AS skill_point_count,
    (SELECT COUNT(*) FROM memory_cards) AS card_count,
    (SELECT COUNT(*) FROM evidence) AS evidence_count,
    (SELECT COUNT(*) FROM workouts) AS workout_count
        "#,
    )
    .fetch_one(pool)
    .await?;

    let direction_count = counts_row.get::<i64, _>("direction_count");
    let skill_point_count = counts_row.get::<i64, _>("skill_point_count");
    let card_count = counts_row.get::<i64, _>("card_count");
    let evidence_count = counts_row.get::<i64, _>("evidence_count");
    let workout_count = counts_row.get::<i64, _>("workout_count");

    let last_workout_completed_at = sqlx::query_scalar::<_, Option<String>>(
        "SELECT completed_at FROM workouts WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await?
    .flatten();

    Ok(Json(SettingsSummaryResponse {
        data_path,
        database_size_bytes,
        direction_count,
        skill_point_count,
        card_count,
        evidence_count,
        workout_count,
        last_workout_completed_at,
    }))
}

async fn get_settings_export(
    State(state): State<AppState>,
) -> AppResult<Json<SettingsExportResponse>> {
    let pool = state.pool();

    let directions = sqlx::query_as::<_, SettingsDirectionExport>(
        r#"
SELECT id, name, stage, quarterly_goal, created_at, updated_at
FROM directions
ORDER BY created_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let skill_points = sqlx::query_as::<_, SettingsSkillPointExport>(
        r#"
SELECT id, direction_id, name, summary, level, created_at, updated_at
FROM skill_points
ORDER BY created_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let cards = sqlx::query_as::<_, SettingsCardExport>(
        r#"
SELECT
    id,
    direction_id,
    skill_point_id,
    title,
    body,
    card_type,
    stability,
    relevance,
    novelty,
    priority,
    next_due,
    created_at,
    updated_at
FROM memory_cards
ORDER BY created_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let evidence = sqlx::query_as::<_, SettingsEvidenceExport>(
        r#"
SELECT id, card_id, source_type, source_uri, excerpt, credibility, created_at
FROM evidence
ORDER BY created_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let card_tags = sqlx::query_as::<_, SettingsCardTagExport>(
        r#"
SELECT card_id, tag
FROM card_tags
ORDER BY card_id ASC, tag ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let workouts = sqlx::query_as::<_, SettingsWorkoutExport>(
        r#"
SELECT id, scheduled_for, completed_at, status, payload, created_at, updated_at
FROM workouts
ORDER BY scheduled_for ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let workout_items = sqlx::query_as::<_, SettingsWorkoutItemExport>(
        r#"
SELECT id, workout_id, card_id, sequence, phase, result, due_at, created_at
FROM workout_items
ORDER BY workout_id ASC, sequence ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let applications = sqlx::query_as::<_, SettingsCardApplicationExport>(
        r#"
SELECT id, card_id, context, noted_at
FROM card_applications
ORDER BY noted_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(Json(SettingsExportResponse {
        directions,
        skill_points,
        cards,
        evidence,
        card_tags,
        workouts,
        workout_items,
        applications,
    }))
}

async fn get_notification_preferences(
    State(state): State<AppState>,
) -> AppResult<Json<NotificationPreferencesResponse>> {
    let pool = state.pool();

    let record = sqlx::query_as::<_, NotificationPreferencesRow>(
        r#"
SELECT
    daily_reminder_enabled,
    daily_reminder_time,
    daily_reminder_target,
    due_reminder_enabled,
    due_reminder_time,
    due_reminder_target,
    remind_before_due_minutes,
    updated_at
FROM notification_preferences
WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?;

    let row = if let Some(row) = record {
        row
    } else {
        return Ok(Json(NotificationPreferencesResponse {
            daily_reminder_enabled: true,
            daily_reminder_time: "21:00".to_string(),
            daily_reminder_target: NotificationTarget::Today,
            due_reminder_enabled: true,
            due_reminder_time: "20:30".to_string(),
            due_reminder_target: NotificationTarget::Review,
            remind_before_due_minutes: 45,
            updated_at: Utc::now().to_rfc3339(),
        }));
    };

    let daily_target = NotificationTarget::from_str(&row.daily_reminder_target)?;
    let due_target = NotificationTarget::from_str(&row.due_reminder_target)?;

    Ok(Json(NotificationPreferencesResponse {
        daily_reminder_enabled: row.daily_reminder_enabled != 0,
        daily_reminder_time: row.daily_reminder_time,
        daily_reminder_target: daily_target,
        due_reminder_enabled: row.due_reminder_enabled != 0,
        due_reminder_time: row.due_reminder_time,
        due_reminder_target: due_target,
        remind_before_due_minutes: row.remind_before_due_minutes,
        updated_at: row.updated_at,
    }))
}

async fn update_notification_preferences(
    State(state): State<AppState>,
    Json(payload): Json<UpdateNotificationPreferencesRequest>,
) -> AppResult<Json<NotificationPreferencesResponse>> {
    NaiveTime::parse_from_str(&payload.daily_reminder_time, "%H:%M").map_err(|_| {
        AppError::Validation("daily_reminder_time must be in HH:MM format".to_string())
    })?;
    NaiveTime::parse_from_str(&payload.due_reminder_time, "%H:%M").map_err(|_| {
        AppError::Validation("due_reminder_time must be in HH:MM format".to_string())
    })?;

    if payload.remind_before_due_minutes < 0 {
        return Err(AppError::Validation(
            "remind_before_due_minutes must be non-negative".to_string(),
        ));
    }

    let pool = state.pool();

    sqlx::query(
        r#"
INSERT INTO notification_preferences (
    id,
    daily_reminder_enabled,
    daily_reminder_time,
    daily_reminder_target,
    due_reminder_enabled,
    due_reminder_time,
    due_reminder_target,
    remind_before_due_minutes,
    created_at,
    updated_at
)
VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
    daily_reminder_enabled = excluded.daily_reminder_enabled,
    daily_reminder_time = excluded.daily_reminder_time,
    daily_reminder_target = excluded.daily_reminder_target,
    due_reminder_enabled = excluded.due_reminder_enabled,
    due_reminder_time = excluded.due_reminder_time,
    due_reminder_target = excluded.due_reminder_target,
    remind_before_due_minutes = excluded.remind_before_due_minutes,
    updated_at = datetime('now')
        "#,
    )
    .bind(if payload.daily_reminder_enabled { 1 } else { 0 })
    .bind(&payload.daily_reminder_time)
    .bind(payload.daily_reminder_target.as_str())
    .bind(if payload.due_reminder_enabled { 1 } else { 0 })
    .bind(&payload.due_reminder_time)
    .bind(payload.due_reminder_target.as_str())
    .bind(payload.remind_before_due_minutes)
    .execute(pool)
    .await?;

    get_notification_preferences(State(state)).await
}
