use std::str::FromStr;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, patch},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::domain::{Direction, DirectionDraft, DirectionStage, DirectionUpdate};
use crate::error::{AppError, AppResult};
use crate::repositories::directions::DirectionRepository;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/directions",
            get(list_directions).post(create_direction),
        )
        .route(
            "/api/directions/:id",
            patch(patch_direction).delete(delete_direction),
        )
}

async fn list_directions(State(state): State<AppState>) -> AppResult<Json<Vec<Direction>>> {
    let repo = DirectionRepository::new(state.pool());
    let directions = repo.list().await?;
    Ok(Json(directions))
}

async fn create_direction(
    State(state): State<AppState>,
    Json(payload): Json<DirectionCreateRequest>,
) -> AppResult<(StatusCode, Json<Direction>)> {
    let repo = DirectionRepository::new(state.pool());
    let draft = payload.try_into()?;
    let direction = repo.create(draft).await?;
    Ok((StatusCode::CREATED, Json(direction)))
}

async fn patch_direction(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<DirectionUpdateRequest>,
) -> AppResult<Json<Direction>> {
    let repo = DirectionRepository::new(state.pool());
    let update = payload.try_into()?;
    match repo.update(id, update).await? {
        Some(direction) => Ok(Json(direction)),
        None => Err(AppError::NotFound),
    }
}

async fn delete_direction(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let repo = DirectionRepository::new(state.pool());
    if repo.delete(id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

#[derive(Debug, Deserialize)]
struct DirectionCreateRequest {
    name: String,
    stage: String,
    #[serde(default)]
    quarterly_goal: Option<String>,
}

impl TryFrom<DirectionCreateRequest> for DirectionDraft {
    type Error = AppError;

    fn try_from(value: DirectionCreateRequest) -> Result<Self, Self::Error> {
        let stage = DirectionStage::from_str(&value.stage)
            .map_err(|err| AppError::Validation(err.to_string()))?;

        Ok(DirectionDraft {
            name: value.name,
            stage,
            quarterly_goal: value.quarterly_goal,
        })
    }
}

#[derive(Debug, Deserialize)]
struct DirectionUpdateRequest {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    stage: Option<String>,
    #[serde(default)]
    quarterly_goal: Option<Option<String>>,
}

impl TryFrom<DirectionUpdateRequest> for DirectionUpdate {
    type Error = AppError;

    fn try_from(value: DirectionUpdateRequest) -> Result<Self, Self::Error> {
        let stage = match value.stage {
            Some(stage) => Some(
                DirectionStage::from_str(&stage)
                    .map_err(|err| AppError::Validation(err.to_string()))?,
            ),
            None => None,
        };

        Ok(DirectionUpdate {
            name: value.name,
            stage,
            quarterly_goal: value.quarterly_goal,
        })
    }
}
