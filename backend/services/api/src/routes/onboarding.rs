use std::collections::HashMap;
use std::str::FromStr;

use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::{
    CardType, Direction, DirectionDraft, DirectionStage, MemoryCard, MemoryCardDraft, SkillLevel,
    SkillPoint, SkillPointDraft, TodayWorkoutPlan,
};
use crate::error::{AppError, AppResult};
use crate::services::today::TodayScheduler;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/onboarding/bootstrap", post(bootstrap_onboarding))
}

async fn bootstrap_onboarding(
    State(state): State<AppState>,
    Json(payload): Json<OnboardingBootstrapRequest>,
) -> AppResult<(StatusCode, Json<OnboardingBootstrapResponse>)> {
    if payload.directions.is_empty() {
        return Err(AppError::Validation(
            "directions cannot be empty for onboarding".to_string(),
        ));
    }

    let mut tx = state.pool().begin().await?;

    let mut created = Vec::with_capacity(payload.directions.len());

    for entry in payload.directions {
        let stage = DirectionStage::from_str(&entry.stage)
            .map_err(|err| AppError::Validation(err.to_string()))?;
        let draft = DirectionDraft {
            name: entry.name,
            stage,
            quarterly_goal: entry.quarterly_goal,
        };

        let direction = insert_direction(&mut tx, draft).await?;
        let direction_id = direction.id;

        let mut created_skills = Vec::with_capacity(entry.skills.len());
        let mut skill_lookup = HashMap::new();

        for skill in entry.skills {
            let level = match skill.level {
                Some(level) => Some(parse_skill_level(&level)?),
                None => None,
            };
            let draft = SkillPointDraft {
                name: skill.name,
                summary: skill.summary,
                level,
            };
            let record = insert_skill(&mut tx, direction_id, draft).await?;
            skill_lookup.insert(record.name.to_lowercase(), record.id);
            created_skills.push(record);
        }

        let mut created_cards = Vec::with_capacity(entry.cards.len());

        for card in entry.cards {
            let card_type = CardType::from_str(&card.card_type)
                .map_err(|err| AppError::Validation(err.to_string()))?;
            let skill_point_id = card
                .skill_point_name
                .and_then(|name| skill_lookup.get(&name.to_lowercase()).copied());

            let draft = MemoryCardDraft {
                skill_point_id,
                title: card.title,
                body: card.body,
                card_type,
                stability: card.stability,
                relevance: card.relevance,
                novelty: card.novelty,
                priority: card.priority,
                next_due: card.next_due,
            };

            let record = insert_card(&mut tx, direction_id, draft).await?;
            created_cards.push(record);
        }

        created.push(OnboardingDirectionBundle {
            direction,
            skill_points: created_skills,
            cards: created_cards,
        });
    }

    tx.commit().await?;

    let scheduler = TodayScheduler::new(state.pool());
    let today_plan = scheduler.get_or_schedule().await?;

    Ok((
        StatusCode::CREATED,
        Json(OnboardingBootstrapResponse {
            directions: created,
            today_plan,
        }),
    ))
}

async fn insert_direction(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    draft: DirectionDraft,
) -> AppResult<Direction> {
    let now = Utc::now();
    let id = Uuid::new_v4();
    let direction = Direction::new(id, draft, now);

    sqlx::query(
        "INSERT INTO directions (id, name, stage, quarterly_goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(direction.id.to_string())
    .bind(&direction.name)
    .bind(direction.stage.to_string())
    .bind(&direction.quarterly_goal)
    .bind(direction.created_at.to_rfc3339())
    .bind(direction.updated_at.to_rfc3339())
    .execute(&mut **tx)
    .await?;

    Ok(direction)
}

async fn insert_skill(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    direction_id: Uuid,
    draft: SkillPointDraft,
) -> AppResult<SkillPoint> {
    let now = Utc::now();
    let id = Uuid::new_v4();
    let skill = SkillPoint::new(id, direction_id, draft, now);

    sqlx::query("INSERT INTO skill_points (id, direction_id, name, summary, level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(skill.id.to_string())
        .bind(skill.direction_id.to_string())
        .bind(&skill.name)
        .bind(&skill.summary)
        .bind(skill.level.as_str())
        .bind(skill.created_at.to_rfc3339())
        .bind(skill.updated_at.to_rfc3339())
        .execute(&mut **tx)
        .await?;

    Ok(skill)
}

async fn insert_card(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    direction_id: Uuid,
    draft: MemoryCardDraft,
) -> AppResult<MemoryCard> {
    let now = Utc::now();
    let id = Uuid::new_v4();
    let card = MemoryCard::new(id, direction_id, draft, now);

    sqlx::query("INSERT INTO memory_cards (id, direction_id, skill_point_id, title, body, card_type, stability, relevance, novelty, priority, next_due, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(card.id.to_string())
        .bind(card.direction_id.to_string())
        .bind(card.skill_point_id.map(|value| value.to_string()))
        .bind(&card.title)
        .bind(&card.body)
        .bind(card.card_type.as_str())
        .bind(card.stability)
        .bind(card.relevance)
        .bind(card.novelty)
        .bind(card.priority)
        .bind(card.next_due.map(|dt| dt.to_rfc3339()))
        .bind(card.created_at.to_rfc3339())
        .bind(card.updated_at.to_rfc3339())
        .execute(&mut **tx)
        .await?;

    Ok(card)
}

fn parse_skill_level(value: &str) -> AppResult<SkillLevel> {
    Ok(SkillLevel::from_str(value).map_err(|err| AppError::Validation(err.to_string()))?)
}

#[derive(Debug, Deserialize)]
struct OnboardingBootstrapRequest {
    directions: Vec<OnboardingDirectionSeed>,
}

#[derive(Debug, Deserialize)]
struct OnboardingDirectionSeed {
    name: String,
    stage: String,
    #[serde(default)]
    quarterly_goal: Option<String>,
    #[serde(default)]
    skills: Vec<OnboardingSkillSeed>,
    #[serde(default)]
    cards: Vec<OnboardingCardSeed>,
}

#[derive(Debug, Deserialize)]
struct OnboardingSkillSeed {
    name: String,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    level: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OnboardingCardSeed {
    title: String,
    body: String,
    card_type: String,
    #[serde(default)]
    skill_point_name: Option<String>,
    #[serde(default)]
    stability: Option<f64>,
    #[serde(default)]
    relevance: Option<f64>,
    #[serde(default)]
    novelty: Option<f64>,
    #[serde(default)]
    priority: Option<f64>,
    #[serde(default)]
    next_due: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct OnboardingBootstrapResponse {
    directions: Vec<OnboardingDirectionBundle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    today_plan: Option<TodayWorkoutPlan>,
}

#[derive(Debug, Serialize)]
struct OnboardingDirectionBundle {
    direction: Direction,
    skill_points: Vec<SkillPoint>,
    cards: Vec<MemoryCard>,
}
