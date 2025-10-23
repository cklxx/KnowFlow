use std::str::FromStr;

use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::domain::{
    parse_notification_time, NotificationPreferences, NotificationPreferencesUpdate, ReminderTarget,
};
use crate::error::AppResult;
use crate::repositories::notification_preferences::NotificationPreferencesRepository;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route(
        "/api/settings/notifications",
        get(get_preferences).patch(update_preferences),
    )
}

#[derive(Debug, Serialize)]
struct NotificationPreferencesResponse {
    daily_reminder_enabled: bool,
    daily_reminder_time: String,
    daily_reminder_target: String,
    due_reminder_enabled: bool,
    due_reminder_time: String,
    due_reminder_target: String,
    remind_before_due_minutes: u32,
}

impl From<NotificationPreferences> for NotificationPreferencesResponse {
    fn from(value: NotificationPreferences) -> Self {
        Self {
            daily_reminder_enabled: value.daily_reminder_enabled,
            daily_reminder_time: value.daily_reminder_time.format("%H:%M").to_string(),
            daily_reminder_target: value.daily_reminder_target.as_str().to_string(),
            due_reminder_enabled: value.due_reminder_enabled,
            due_reminder_time: value.due_reminder_time.format("%H:%M").to_string(),
            due_reminder_target: value.due_reminder_target.as_str().to_string(),
            remind_before_due_minutes: value.remind_before_due_minutes,
        }
    }
}

async fn get_preferences(
    State(state): State<AppState>,
) -> AppResult<Json<NotificationPreferencesResponse>> {
    let repo = NotificationPreferencesRepository::new(state.pool());
    let prefs = repo.get().await?;
    Ok(Json(NotificationPreferencesResponse::from(prefs)))
}

#[derive(Debug, Deserialize)]
struct UpdateNotificationPreferencesRequest {
    #[serde(default)]
    daily_reminder_enabled: Option<bool>,
    #[serde(default)]
    daily_reminder_time: Option<String>,
    #[serde(default)]
    daily_reminder_target: Option<String>,
    #[serde(default)]
    due_reminder_enabled: Option<bool>,
    #[serde(default)]
    due_reminder_time: Option<String>,
    #[serde(default)]
    due_reminder_target: Option<String>,
    #[serde(default)]
    remind_before_due_minutes: Option<u32>,
}

async fn update_preferences(
    State(state): State<AppState>,
    Json(payload): Json<UpdateNotificationPreferencesRequest>,
) -> AppResult<Json<NotificationPreferencesResponse>> {
    let repo = NotificationPreferencesRepository::new(state.pool());
    let mut update = NotificationPreferencesUpdate::default();

    update.daily_reminder_enabled = payload.daily_reminder_enabled;
    if let Some(time) = payload.daily_reminder_time {
        update.daily_reminder_time = Some(parse_notification_time(&time)?);
    }
    if let Some(target) = payload.daily_reminder_target {
        update.daily_reminder_target = Some(ReminderTarget::from_str(&target)?);
    }

    update.due_reminder_enabled = payload.due_reminder_enabled;
    if let Some(time) = payload.due_reminder_time {
        update.due_reminder_time = Some(parse_notification_time(&time)?);
    }
    if let Some(target) = payload.due_reminder_target {
        update.due_reminder_target = Some(ReminderTarget::from_str(&target)?);
    }
    update.remind_before_due_minutes = payload.remind_before_due_minutes;

    let prefs = repo.update(update).await?;
    Ok(Json(NotificationPreferencesResponse::from(prefs)))
}
