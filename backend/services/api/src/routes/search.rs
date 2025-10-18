use std::str::FromStr;

use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::{
    domain::{DirectionStage, SkillLevel},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/search", get(search_index))
        .route("/api/search/suggestions", get(search_suggestions))
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

#[derive(Debug, Serialize)]
struct SearchSuggestionResponse {
    groups: Vec<SearchSuggestionGroup>,
}

#[derive(Debug, Serialize)]
struct SearchSuggestionGroup {
    id: String,
    title: String,
    hint: Option<String>,
    items: Vec<SearchSuggestionItem>,
}

#[derive(Debug, Serialize)]
struct SearchSuggestionItem {
    id: String,
    label: String,
    description: Option<String>,
    pill: Option<String>,
    action: SearchSuggestionAction,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum SearchSuggestionAction {
    Search { query: String },
    Navigate { href: String },
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

async fn search_suggestions(
    State(state): State<AppState>,
) -> AppResult<Json<SearchSuggestionResponse>> {
    let pool = state.pool();

    let quickstart_rows = sqlx::query(
        r#"
SELECT
    ca.id,
    ca.context,
    c.title AS card_title,
    d.name AS direction_name
FROM card_applications ca
INNER JOIN memory_cards c ON c.id = ca.card_id
INNER JOIN directions d ON d.id = c.direction_id
ORDER BY ca.noted_at DESC
LIMIT 3
        "#,
    )
    .fetch_all(pool)
    .await?;

    let quickstart_items = quickstart_rows
        .into_iter()
        .map(|row| {
            let card_title: String = row.get("card_title");
            let direction_name: String = row.get("direction_name");
            let context: String = row.get("context");
            SearchSuggestionItem {
                id: row.get("id"),
                label: format!("复盘 {card_title}"),
                description: Some(format!(
                    "{} · {}",
                    direction_name,
                    truncate_preview(&context, 32)
                )),
                pill: Some("推荐".to_string()),
                action: SearchSuggestionAction::Search { query: card_title },
            }
        })
        .collect::<Vec<_>>();

    let direction_rows = sqlx::query(
        r#"
SELECT
    d.id,
    d.name,
    d.stage,
    d.updated_at,
    COUNT(mc.id) AS card_count
FROM directions d
LEFT JOIN memory_cards mc ON mc.direction_id = d.id
GROUP BY d.id, d.name, d.stage, d.updated_at
ORDER BY d.updated_at DESC
LIMIT 4
        "#,
    )
    .fetch_all(pool)
    .await?;

    let direction_items = direction_rows
        .into_iter()
        .filter_map(|row| {
            let stage_raw: String = row.get("stage");
            let stage = DirectionStage::from_str(&stage_raw).ok()?;
            let id: String = row.get("id");
            let name: String = row.get("name");
            let card_count: i64 = row.get("card_count");
            Some(SearchSuggestionItem {
                id: format!("suggest-dir-{id}"),
                label: name.clone(),
                description: Some(format!("{} · {} 张卡片", stage_label(&stage), card_count)),
                pill: Some(stage_label(&stage).to_string()),
                action: SearchSuggestionAction::Navigate {
                    href: format!("/tree?direction={id}"),
                },
            })
        })
        .collect::<Vec<_>>();

    let skill_rows = sqlx::query(
        r#"
SELECT
    sp.id,
    sp.name,
    sp.level,
    sp.updated_at,
    COUNT(mc.id) AS card_count
FROM skill_points sp
LEFT JOIN memory_cards mc ON mc.skill_point_id = sp.id
GROUP BY sp.id, sp.name, sp.level, sp.updated_at
ORDER BY sp.updated_at DESC
LIMIT 4
        "#,
    )
    .fetch_all(pool)
    .await?;

    let skill_items = skill_rows
        .into_iter()
        .map(|row| {
            let id: String = row.get("id");
            let name: String = row.get("name");
            let level_value: i64 = row.get("level");
            let level = SkillLevel::clamp(level_value as i32);
            let card_count: i64 = row.get("card_count");
            SearchSuggestionItem {
                id: format!("suggest-skill-{id}"),
                label: name.clone(),
                description: Some(format!(
                    "{} · {} 张卡片",
                    skill_level_label(level),
                    card_count
                )),
                pill: Some("技能".to_string()),
                action: SearchSuggestionAction::Search { query: name },
            }
        })
        .collect::<Vec<_>>();

    let mut groups = Vec::new();
    if !quickstart_items.is_empty() {
        groups.push(SearchSuggestionGroup {
            id: "quickstart".to_string(),
            title: "快速提示".to_string(),
            hint: Some("结合最近训练推荐的检索词与操作".to_string()),
            items: quickstart_items,
        });
    }

    if !direction_items.is_empty() {
        groups.push(SearchSuggestionGroup {
            id: "recent-directions".to_string(),
            title: "最近方向".to_string(),
            hint: None,
            items: direction_items,
        });
    }

    if !skill_items.is_empty() {
        groups.push(SearchSuggestionGroup {
            id: "skill-focus".to_string(),
            title: "技能热区".to_string(),
            hint: Some("点击快速检索相关卡片与证据".to_string()),
            items: skill_items,
        });
    }

    Ok(Json(SearchSuggestionResponse { groups }))
}

fn stage_label(stage: &DirectionStage) -> &'static str {
    match stage {
        DirectionStage::Explore => "探索",
        DirectionStage::Shape => "成型",
        DirectionStage::Attack => "攻坚",
        DirectionStage::Stabilize => "固化",
    }
}

fn skill_level_label(level: SkillLevel) -> &'static str {
    match level {
        SkillLevel::Unknown => "待熟悉",
        SkillLevel::Emerging => "萌芽",
        SkillLevel::Working => "实战中",
        SkillLevel::Fluent => "自如",
    }
}

fn truncate_preview(value: &str, limit: usize) -> String {
    let trimmed = value.trim();
    if trimmed.chars().count() <= limit {
        return trimmed.to_string();
    }
    let snippet: String = trimmed.chars().take(limit).collect();
    format!("{snippet}…")
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
