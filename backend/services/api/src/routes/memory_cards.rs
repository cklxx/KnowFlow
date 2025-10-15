use std::str::FromStr;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::domain::{CardType, MemoryCard, MemoryCardDraft, MemoryCardUpdate};
use crate::error::{AppError, AppResult};
use crate::repositories::memory_cards::{MemoryCardRepository, MemoryCardSearch};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/cards", get(search_cards))
        .route(
            "/api/directions/:direction_id/cards",
            get(list_cards).post(create_card),
        )
        .route(
            "/api/cards/:id",
            get(get_card).patch(update_card).delete(delete_card),
        )
}

async fn search_cards(
    State(state): State<AppState>,
    Query(params): Query<MemoryCardSearchQuery>,
) -> AppResult<Json<Vec<MemoryCard>>> {
    let repo = MemoryCardRepository::new(state.pool());
    let search = MemoryCardSearch {
        direction_id: params.direction_id,
        skill_point_id: params.skill_point_id,
        query: params.q.as_deref(),
        due_before: params.due_before,
        limit: params.limit,
    };
    let cards = repo.search(search).await?;
    Ok(Json(cards))
}

async fn list_cards(
    State(state): State<AppState>,
    Path(direction_id): Path<Uuid>,
) -> AppResult<Json<Vec<MemoryCard>>> {
    let repo = MemoryCardRepository::new(state.pool());
    // TODO: filter by skill_point_id once repository supports it
    let cards = repo.list_by_direction(direction_id).await?;
    Ok(Json(cards))
}

async fn create_card(
    State(state): State<AppState>,
    Path(direction_id): Path<Uuid>,
    Json(payload): Json<MemoryCardCreateRequest>,
) -> AppResult<(StatusCode, Json<MemoryCard>)> {
    let repo = MemoryCardRepository::new(state.pool());
    let draft = payload.try_into()?;
    let card = repo.create(direction_id, draft).await?;
    Ok((StatusCode::CREATED, Json(card)))
}

async fn update_card(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<MemoryCardUpdateRequest>,
) -> AppResult<Json<MemoryCard>> {
    let repo = MemoryCardRepository::new(state.pool());
    let update = payload.try_into()?;
    match repo.update(id, update).await? {
        Some(card) => Ok(Json(card)),
        None => Err(AppError::NotFound),
    }
}

async fn delete_card(State(state): State<AppState>, Path(id): Path<Uuid>) -> AppResult<StatusCode> {
    let repo = MemoryCardRepository::new(state.pool());
    if repo.delete(id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

async fn get_card(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<MemoryCard>> {
    let repo = MemoryCardRepository::new(state.pool());
    match repo.get(id).await? {
        Some(card) => Ok(Json(card)),
        None => Err(AppError::NotFound),
    }
}

#[derive(Debug, Deserialize)]
struct MemoryCardCreateRequest {
    title: String,
    body: String,
    card_type: String,
    #[serde(default)]
    skill_point_id: Option<Uuid>,
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

impl TryFrom<MemoryCardCreateRequest> for MemoryCardDraft {
    type Error = AppError;

    fn try_from(value: MemoryCardCreateRequest) -> Result<Self, Self::Error> {
        let card_type = CardType::from_str(&value.card_type)
            .map_err(|err| AppError::Validation(err.to_string()))?;

        Ok(MemoryCardDraft {
            skill_point_id: value.skill_point_id,
            title: value.title,
            body: value.body,
            card_type,
            stability: value.stability,
            relevance: value.relevance,
            novelty: value.novelty,
            priority: value.priority,
            next_due: value.next_due,
        })
    }
}

#[derive(Debug, Deserialize)]
struct MemoryCardUpdateRequest {
    #[serde(default)]
    skill_point_id: Option<Option<Uuid>>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    body: Option<String>,
    #[serde(default)]
    card_type: Option<String>,
    #[serde(default)]
    stability: Option<f64>,
    #[serde(default)]
    relevance: Option<f64>,
    #[serde(default)]
    novelty: Option<f64>,
    #[serde(default)]
    priority: Option<f64>,
    #[serde(default)]
    next_due: Option<Option<DateTime<Utc>>>,
}

#[derive(Debug, Deserialize, Default)]
struct MemoryCardSearchQuery {
    #[serde(default)]
    direction_id: Option<Uuid>,
    #[serde(default)]
    skill_point_id: Option<Uuid>,
    #[serde(default)]
    q: Option<String>,
    #[serde(default)]
    due_before: Option<DateTime<Utc>>,
    #[serde(default)]
    limit: Option<usize>,
}

impl TryFrom<MemoryCardUpdateRequest> for MemoryCardUpdate {
    type Error = AppError;

    fn try_from(value: MemoryCardUpdateRequest) -> Result<Self, Self::Error> {
        let card_type = value
            .card_type
            .map(|t| CardType::from_str(&t).map_err(|err| AppError::Validation(err.to_string())))
            .transpose()?;

        Ok(MemoryCardUpdate {
            skill_point_id: value.skill_point_id,
            title: value.title,
            body: value.body,
            card_type,
            stability: value.stability,
            relevance: value.relevance,
            novelty: value.novelty,
            priority: value.priority,
            next_due: value.next_due,
        })
    }
}
