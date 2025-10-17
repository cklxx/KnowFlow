use std::str::FromStr;

use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::{
    domain::DirectionStage,
    error::{AppError, AppResult},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/search", get(search_index))
}

#[derive(Debug, Deserialize)]
struct SearchParams {
    q: Option<String>,
    limit: Option<usize>,
}

#[derive(Debug, Serialize)]
struct SearchResponse {
    query: String,
    cards: Vec<SearchCard>,
    evidence: Vec<SearchEvidence>,
    evergreen: Vec<SearchEvergreen>,
    applications: Vec<SearchApplication>,
    directions: Vec<SearchDirection>,
}

#[derive(Debug, Serialize)]
struct SearchCard {
    id: String,
    title: String,
    body: String,
    card_type: String,
    priority: f64,
    stability: f64,
    next_due: Option<String>,
    direction_id: String,
    direction_name: String,
    skill_point_id: Option<String>,
    skill_point_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct SearchEvidence {
    id: String,
    excerpt: Option<String>,
    source_type: String,
    source_uri: Option<String>,
    credibility: i64,
    captured_at: String,
    card_id: String,
    card_title: String,
    direction_id: String,
    direction_name: String,
}

#[derive(Debug, Serialize)]
struct SearchEvergreen {
    id: String,
    title: String,
    summary: String,
    stability: f64,
    application_count: i64,
    last_applied_at: Option<String>,
    direction_id: String,
    direction_name: String,
}

#[derive(Debug, Serialize)]
struct SearchApplication {
    id: String,
    context: String,
    noted_at: String,
    impact_score: f64,
    card_id: String,
    card_title: String,
    direction_id: String,
    direction_name: String,
    skill_point_id: Option<String>,
    skill_point_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct SearchDirection {
    id: String,
    name: String,
    stage: DirectionStage,
    quarterly_goal: Option<String>,
    card_count: i64,
    skill_point_count: i64,
}

async fn search_index(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> AppResult<Json<SearchResponse>> {
    let pool = state.pool();
    let raw_query = params.q.unwrap_or_default();
    let trimmed = raw_query.trim();

    if trimmed.is_empty() {
        return Ok(Json(SearchResponse {
            query: String::new(),
            cards: Vec::new(),
            evidence: Vec::new(),
            evergreen: Vec::new(),
            applications: Vec::new(),
            directions: Vec::new(),
        }));
    }

    let limit = params.limit.unwrap_or(8).clamp(1, 50) as i64;
    let pattern = format!("%{}%", escape_like(trimmed));

    let cards = sqlx::query(
        r#"
SELECT
    c.id,
    c.title,
    c.body,
    c.card_type,
    c.priority,
    c.stability,
    c.next_due,
    d.id AS direction_id,
    d.name AS direction_name,
    sp.id AS skill_point_id,
    sp.name AS skill_point_name
FROM memory_cards c
INNER JOIN directions d ON d.id = c.direction_id
LEFT JOIN skill_points sp ON sp.id = c.skill_point_id
WHERE (
    c.title LIKE ? ESCAPE '\\'
    OR c.body LIKE ? ESCAPE '\\'
    OR d.name LIKE ? ESCAPE '\\'
)
ORDER BY c.priority DESC, c.updated_at DESC
LIMIT ?
        "#,
    )
    .bind(&pattern)
    .bind(&pattern)
    .bind(&pattern)
    .bind(limit)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| SearchCard {
        id: row.get("id"),
        title: row.get("title"),
        body: row.get("body"),
        card_type: row.get("card_type"),
        priority: row.get("priority"),
        stability: row.get("stability"),
        next_due: row.get("next_due"),
        direction_id: row.get("direction_id"),
        direction_name: row.get("direction_name"),
        skill_point_id: row.get("skill_point_id"),
        skill_point_name: row.get("skill_point_name"),
    })
    .collect();

    let evidence = sqlx::query(
        r#"
SELECT
    e.id,
    e.excerpt,
    e.source_type,
    e.source_uri,
    e.credibility,
    e.created_at,
    c.id AS card_id,
    c.title AS card_title,
    d.id AS direction_id,
    d.name AS direction_name
FROM evidence e
INNER JOIN memory_cards c ON c.id = e.card_id
INNER JOIN directions d ON d.id = c.direction_id
WHERE (
    e.excerpt LIKE ? ESCAPE '\\'
    OR c.title LIKE ? ESCAPE '\\'
    OR d.name LIKE ? ESCAPE '\\'
)
ORDER BY e.created_at DESC
LIMIT ?
        "#,
    )
    .bind(&pattern)
    .bind(&pattern)
    .bind(&pattern)
    .bind(limit)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| SearchEvidence {
        id: row.get("id"),
        excerpt: row.get("excerpt"),
        source_type: row.get("source_type"),
        source_uri: row.get("source_uri"),
        credibility: row.get("credibility"),
        captured_at: row.get("created_at"),
        card_id: row.get("card_id"),
        card_title: row.get("card_title"),
        direction_id: row.get("direction_id"),
        direction_name: row.get("direction_name"),
    })
    .collect();

    let evergreen = sqlx::query(
        r#"
SELECT
    c.id,
    c.title,
    c.body,
    c.stability,
    d.id AS direction_id,
    d.name AS direction_name,
    COUNT(a.id) AS application_count,
    MAX(a.noted_at) AS last_applied_at
FROM memory_cards c
INNER JOIN directions d ON d.id = c.direction_id
LEFT JOIN card_applications a ON a.card_id = c.id
WHERE (
    c.title LIKE ? ESCAPE '\\'
    OR c.body LIKE ? ESCAPE '\\'
    OR d.name LIKE ? ESCAPE '\\'
)
GROUP BY c.id, c.title, c.body, c.stability, d.id, d.name
HAVING c.stability >= 0.7 AND application_count >= 2
ORDER BY application_count DESC, last_applied_at DESC
LIMIT ?
        "#,
    )
    .bind(&pattern)
    .bind(&pattern)
    .bind(&pattern)
    .bind(limit)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| SearchEvergreen {
        id: row.get("id"),
        title: row.get("title"),
        summary: row.get("body"),
        stability: row.get("stability"),
        application_count: row.get("application_count"),
        last_applied_at: row.get("last_applied_at"),
        direction_id: row.get("direction_id"),
        direction_name: row.get("direction_name"),
    })
    .collect();

    let application_rows = sqlx::query(
        r#"
SELECT
    a.id,
    a.context,
    a.noted_at,
    c.priority,
    c.stability,
    c.id AS card_id,
    c.title AS card_title,
    d.id AS direction_id,
    d.name AS direction_name,
    sp.id AS skill_point_id,
    sp.name AS skill_point_name
FROM card_applications a
INNER JOIN memory_cards c ON c.id = a.card_id
INNER JOIN directions d ON d.id = c.direction_id
LEFT JOIN skill_points sp ON sp.id = c.skill_point_id
WHERE (
    a.context LIKE ? ESCAPE '\\'
    OR c.title LIKE ? ESCAPE '\\'
    OR d.name LIKE ? ESCAPE '\\'
)
ORDER BY a.noted_at DESC
LIMIT ?
        "#,
    )
    .bind(&pattern)
    .bind(&pattern)
    .bind(&pattern)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let applications = application_rows
        .into_iter()
        .map(|row| {
            let priority: f64 = row.get("priority");
            let stability: f64 = row.get("stability");
            SearchApplication {
                id: row.get("id"),
                context: row.get("context"),
                noted_at: row.get("noted_at"),
                impact_score: calculate_application_impact(priority, stability),
                card_id: row.get("card_id"),
                card_title: row.get("card_title"),
                direction_id: row.get("direction_id"),
                direction_name: row.get("direction_name"),
                skill_point_id: row.get("skill_point_id"),
                skill_point_name: row.get("skill_point_name"),
            }
        })
        .collect();

    let direction_rows = sqlx::query(
        r#"
SELECT
    d.id,
    d.name,
    d.stage,
    d.quarterly_goal,
    COUNT(DISTINCT sp.id) AS skill_point_count,
    COUNT(DISTINCT mc.id) AS card_count
FROM directions d
LEFT JOIN skill_points sp ON sp.direction_id = d.id
LEFT JOIN memory_cards mc ON mc.direction_id = d.id
WHERE (
    d.name LIKE ? ESCAPE '\\'
    OR d.quarterly_goal LIKE ? ESCAPE '\\'
)
GROUP BY d.id, d.name, d.stage, d.quarterly_goal
ORDER BY card_count DESC
LIMIT ?
        "#,
    )
    .bind(&pattern)
    .bind(&pattern)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let directions = direction_rows
        .into_iter()
        .map(|row| {
            let stage_raw: String = row.get("stage");
            let stage = DirectionStage::from_str(&stage_raw)
                .map_err(|_| AppError::Validation(format!("未知的方向阶段: {}", stage_raw)))?;
            Ok(SearchDirection {
                id: row.get("id"),
                name: row.get("name"),
                stage,
                quarterly_goal: row.get("quarterly_goal"),
                card_count: row.get("card_count"),
                skill_point_count: row.get("skill_point_count"),
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    Ok(Json(SearchResponse {
        query: trimmed.to_string(),
        cards,
        evidence,
        evergreen,
        applications,
        directions,
    }))
}

fn escape_like(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn calculate_application_impact(priority: f64, stability: f64) -> f64 {
    let normalized_priority = priority.clamp(0.0, 1.0);
    let normalized_instability = (1.0 - stability).clamp(0.0, 1.0);
    let blended = (normalized_priority * 0.65) + (normalized_instability * 0.35);
    (blended * 100.0).round() / 100.0
}
