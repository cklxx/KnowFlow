use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::domain::{CardApplication, NewCardApplication};
use crate::error::{AppError, AppResult};
use crate::repositories::card_applications::CardApplicationRepository;
use crate::repositories::memory_cards::MemoryCardRepository;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route(
        "/api/cards/:card_id/applications",
        get(list_applications).post(create_application),
    )
}

#[derive(Debug, Serialize)]
struct CardApplicationDto {
    id: String,
    card_id: String,
    context: String,
    noted_at: String,
}

impl From<CardApplication> for CardApplicationDto {
    fn from(value: CardApplication) -> Self {
        Self {
            id: value.id.to_string(),
            card_id: value.card_id.to_string(),
            context: value.context,
            noted_at: value.noted_at.to_rfc3339(),
        }
    }
}

async fn ensure_card_exists(pool: &SqlitePool, card_id: Uuid) -> AppResult<()> {
    let repo = MemoryCardRepository::new(pool);
    if repo.get(card_id).await?.is_none() {
        return Err(AppError::NotFound);
    }
    Ok(())
}

async fn list_applications(
    State(state): State<AppState>,
    Path(card_id): Path<Uuid>,
) -> AppResult<Json<Vec<CardApplicationDto>>> {
    ensure_card_exists(state.pool(), card_id).await?;

    let repo = CardApplicationRepository::new(state.pool());
    let items = repo.list_for_card(card_id).await?;
    Ok(Json(
        items.into_iter().map(CardApplicationDto::from).collect(),
    ))
}

#[derive(Debug, Deserialize)]
struct CreateCardApplicationRequest {
    context: String,
    #[serde(default)]
    noted_at: Option<DateTime<Utc>>,
}

async fn create_application(
    State(state): State<AppState>,
    Path(card_id): Path<Uuid>,
    Json(payload): Json<CreateCardApplicationRequest>,
) -> AppResult<(StatusCode, Json<CardApplicationDto>)> {
    ensure_card_exists(state.pool(), card_id).await?;

    let context = payload.context.trim();
    if context.is_empty() {
        return Err(AppError::Validation("context cannot be empty".to_string()));
    }

    let repo = CardApplicationRepository::new(state.pool());
    let record = repo
        .create(
            card_id,
            NewCardApplication {
                context: context.to_string(),
                noted_at: payload.noted_at.unwrap_or_else(Utc::now),
            },
        )
        .await?;

    Ok((StatusCode::CREATED, Json(CardApplicationDto::from(record))))
}
