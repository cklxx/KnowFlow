use std::str::FromStr;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, patch},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::domain::{SkillLevel, SkillPoint, SkillPointDraft, SkillPointUpdate};
use crate::error::{AppError, AppResult};
use crate::repositories::skill_points::SkillPointRepository;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/directions/:direction_id/skill-points",
            get(list_skill_points).post(create_skill_point),
        )
        .route(
            "/api/skill-points/:id",
            patch(update_skill_point).delete(delete_skill_point),
        )
}

async fn list_skill_points(
    State(state): State<AppState>,
    Path(direction_id): Path<Uuid>,
) -> AppResult<Json<Vec<SkillPoint>>> {
    let repo = SkillPointRepository::new(state.pool());
    let points = repo.list_by_direction(direction_id).await?;
    Ok(Json(points))
}

async fn create_skill_point(
    State(state): State<AppState>,
    Path(direction_id): Path<Uuid>,
    Json(payload): Json<SkillPointCreateRequest>,
) -> AppResult<(StatusCode, Json<SkillPoint>)> {
    let repo = SkillPointRepository::new(state.pool());
    let draft = payload.try_into()?;
    let point = repo.create(direction_id, draft).await?;
    Ok((StatusCode::CREATED, Json(point)))
}

async fn update_skill_point(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SkillPointUpdateRequest>,
) -> AppResult<Json<SkillPoint>> {
    let repo = SkillPointRepository::new(state.pool());
    let update = payload.try_into()?;
    match repo.update(id, update).await? {
        Some(point) => Ok(Json(point)),
        None => Err(AppError::NotFound),
    }
}

async fn delete_skill_point(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let repo = SkillPointRepository::new(state.pool());
    if repo.delete(id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

#[derive(Debug, Deserialize)]
struct SkillPointCreateRequest {
    name: String,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    level: Option<String>,
}

impl TryFrom<SkillPointCreateRequest> for SkillPointDraft {
    type Error = AppError;

    fn try_from(value: SkillPointCreateRequest) -> Result<Self, Self::Error> {
        let level = value
            .level
            .map(|level| {
                SkillLevel::from_str(&level).map_err(|err| AppError::Validation(err.to_string()))
            })
            .transpose()?;

        Ok(SkillPointDraft {
            name: value.name,
            summary: value.summary,
            level,
        })
    }
}

#[derive(Debug, Deserialize)]
struct SkillPointUpdateRequest {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    summary: Option<Option<String>>,
    #[serde(default)]
    level: Option<String>,
}

impl TryFrom<SkillPointUpdateRequest> for SkillPointUpdate {
    type Error = AppError;

    fn try_from(value: SkillPointUpdateRequest) -> Result<Self, Self::Error> {
        let level = value
            .level
            .map(|level| {
                SkillLevel::from_str(&level).map_err(|err| AppError::Validation(err.to_string()))
            })
            .transpose()?;

        Ok(SkillPointUpdate {
            name: value.name,
            summary: value.summary,
            level,
        })
    }
}
