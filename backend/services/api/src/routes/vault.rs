use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::Row;

use crate::error::AppResult;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/vault", get(get_vault_snapshot))
}

#[derive(Debug, Serialize)]
struct VaultSnapshotResponse {
    highlights: Vec<VaultHighlight>,
    annotations: Vec<VaultAnnotation>,
    cards: Vec<VaultCard>,
    evergreen: Vec<VaultEvergreen>,
}

#[derive(Debug, Serialize)]
struct VaultHighlight {
    id: String,
    direction_id: String,
    direction_name: String,
    card_id: String,
    card_title: String,
    source_type: String,
    source_uri: Option<String>,
    excerpt: Option<String>,
    credibility: i64,
    captured_at: String,
}

#[derive(Debug, Serialize)]
struct VaultAnnotation {
    id: String,
    direction_id: String,
    direction_name: String,
    card_id: String,
    card_title: String,
    context: String,
    noted_at: String,
}

#[derive(Debug, Serialize)]
struct VaultCard {
    id: String,
    direction_id: String,
    direction_name: String,
    skill_point_id: Option<String>,
    skill_point_name: Option<String>,
    title: String,
    card_type: String,
    stability: f64,
    priority: f64,
    next_due: Option<String>,
    updated_at: String,
}

#[derive(Debug, Serialize)]
struct VaultEvergreen {
    id: String,
    direction_id: String,
    direction_name: String,
    title: String,
    summary: String,
    stability: f64,
    application_count: i64,
    last_applied_at: Option<String>,
}

async fn get_vault_snapshot(
    State(state): State<AppState>,
) -> AppResult<Json<VaultSnapshotResponse>> {
    let pool = state.pool();

    let highlight_rows = sqlx::query(
        r#"
SELECT
    e.id as evidence_id,
    e.source_type,
    e.source_uri,
    e.excerpt,
    e.credibility,
    e.created_at as captured_at,
    c.id as card_id,
    c.title as card_title,
    d.id as direction_id,
    d.name as direction_name
FROM evidence e
INNER JOIN memory_cards c ON c.id = e.card_id
INNER JOIN directions d ON d.id = c.direction_id
ORDER BY e.created_at DESC
LIMIT 50
        "#,
    )
    .fetch_all(pool)
    .await?;

    let highlights = highlight_rows
        .into_iter()
        .map(|row| VaultHighlight {
            id: row.get::<String, _>("evidence_id"),
            direction_id: row.get::<String, _>("direction_id"),
            direction_name: row.get::<String, _>("direction_name"),
            card_id: row.get::<String, _>("card_id"),
            card_title: row.get::<String, _>("card_title"),
            source_type: row.get::<String, _>("source_type"),
            source_uri: row.get::<Option<String>, _>("source_uri"),
            excerpt: row.get::<Option<String>, _>("excerpt"),
            credibility: row.get::<i64, _>("credibility"),
            captured_at: row.get::<String, _>("captured_at"),
        })
        .collect();

    let annotation_rows = sqlx::query(
        r#"
SELECT
    a.id as application_id,
    a.context,
    a.noted_at,
    c.id as card_id,
    c.title as card_title,
    d.id as direction_id,
    d.name as direction_name
FROM card_applications a
INNER JOIN memory_cards c ON c.id = a.card_id
INNER JOIN directions d ON d.id = c.direction_id
ORDER BY a.noted_at DESC
LIMIT 50
        "#,
    )
    .fetch_all(pool)
    .await?;

    let annotations = annotation_rows
        .into_iter()
        .map(|row| VaultAnnotation {
            id: row.get::<String, _>("application_id"),
            direction_id: row.get::<String, _>("direction_id"),
            direction_name: row.get::<String, _>("direction_name"),
            card_id: row.get::<String, _>("card_id"),
            card_title: row.get::<String, _>("card_title"),
            context: row.get::<String, _>("context"),
            noted_at: row.get::<String, _>("noted_at"),
        })
        .collect();

    let card_rows = sqlx::query(
        r#"
SELECT
    c.id,
    c.title,
    c.card_type,
    c.stability,
    c.priority,
    c.next_due,
    c.updated_at,
    d.id as direction_id,
    d.name as direction_name,
    sp.id as skill_point_id,
    sp.name as skill_point_name
FROM memory_cards c
INNER JOIN directions d ON d.id = c.direction_id
LEFT JOIN skill_points sp ON sp.id = c.skill_point_id
ORDER BY c.updated_at DESC
LIMIT 50
        "#,
    )
    .fetch_all(pool)
    .await?;

    let cards = card_rows
        .into_iter()
        .map(|row| VaultCard {
            id: row.get::<String, _>("id"),
            direction_id: row.get::<String, _>("direction_id"),
            direction_name: row.get::<String, _>("direction_name"),
            skill_point_id: row.get::<Option<String>, _>("skill_point_id"),
            skill_point_name: row.get::<Option<String>, _>("skill_point_name"),
            title: row.get::<String, _>("title"),
            card_type: row.get::<String, _>("card_type"),
            stability: row.get::<f64, _>("stability"),
            priority: row.get::<f64, _>("priority"),
            next_due: row.get::<Option<String>, _>("next_due"),
            updated_at: row.get::<String, _>("updated_at"),
        })
        .collect();

    let evergreen_rows = sqlx::query(
        r#"
SELECT
    c.id,
    c.title,
    c.body,
    c.stability,
    d.id as direction_id,
    d.name as direction_name,
    COUNT(a.id) as application_count,
    MAX(a.noted_at) as last_applied_at
FROM memory_cards c
INNER JOIN directions d ON d.id = c.direction_id
LEFT JOIN card_applications a ON a.card_id = c.id
GROUP BY c.id, c.title, c.body, c.stability, d.id, d.name
HAVING c.stability >= 0.7 AND application_count >= 2
ORDER BY application_count DESC, last_applied_at DESC
LIMIT 25
        "#,
    )
    .fetch_all(pool)
    .await?;

    let evergreen = evergreen_rows
        .into_iter()
        .map(|row| VaultEvergreen {
            id: row.get::<String, _>("id"),
            direction_id: row.get::<String, _>("direction_id"),
            direction_name: row.get::<String, _>("direction_name"),
            title: row.get::<String, _>("title"),
            summary: row.get::<String, _>("body"),
            stability: row.get::<f64, _>("stability"),
            application_count: row.get::<i64, _>("application_count"),
            last_applied_at: row.get::<Option<String>, _>("last_applied_at"),
        })
        .collect();

    Ok(Json(VaultSnapshotResponse {
        highlights,
        annotations,
        cards,
        evergreen,
    }))
}
