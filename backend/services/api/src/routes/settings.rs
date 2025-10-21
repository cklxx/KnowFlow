use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{FromRow, Row};

use crate::error::AppResult;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/settings/summary", get(get_settings_summary))
        .route("/api/settings/export", get(get_settings_export))
}

#[derive(Debug, Serialize)]
struct SettingsSummaryResponse {
    data_path: Option<String>,
    database_size_bytes: i64,
    direction_count: i64,
    skill_point_count: i64,
    card_count: i64,
}

#[derive(Debug, Serialize)]
struct SettingsExportResponse {
    directions: Vec<SettingsDirectionExport>,
    skill_points: Vec<SettingsSkillPointExport>,
    cards: Vec<SettingsCardExport>,
    evidence: Vec<SettingsEvidenceExport>,
    card_tags: Vec<SettingsCardTagExport>,
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
    (SELECT COUNT(*) FROM memory_cards) AS card_count
        "#,
    )
    .fetch_one(pool)
    .await?;

    let direction_count = counts_row.get::<i64, _>("direction_count");
    let skill_point_count = counts_row.get::<i64, _>("skill_point_count");
    let card_count = counts_row.get::<i64, _>("card_count");

    Ok(Json(SettingsSummaryResponse {
        data_path,
        database_size_bytes,
        direction_count,
        skill_point_count,
        card_count,
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

    Ok(Json(SettingsExportResponse {
        directions,
        skill_points,
        cards,
        evidence,
        card_tags,
    }))
}

