use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::domain::{Evidence, NewEvidence};
use crate::error::{AppError, AppResult};
use crate::repositories::evidence::EvidenceRepository;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/cards/:card_id/evidence",
            get(list_evidence).post(create_evidence),
        )
        .route("/api/evidence/:id", delete(delete_evidence))
}

async fn list_evidence(
    State(state): State<AppState>,
    Path(card_id): Path<Uuid>,
) -> AppResult<Json<Vec<Evidence>>> {
    let repo = EvidenceRepository::new(state.pool());
    let rows = repo.list_for_card(card_id).await?;
    Ok(Json(rows))
}

async fn create_evidence(
    State(state): State<AppState>,
    Path(card_id): Path<Uuid>,
    Json(payload): Json<CreateEvidenceRequest>,
) -> AppResult<(StatusCode, Json<Evidence>)> {
    let repo = EvidenceRepository::new(state.pool());
    let input = NewEvidence {
        source_type: payload.source_type,
        source_uri: payload.source_uri,
        excerpt: payload.excerpt,
        credibility: payload.credibility,
    };
    let evidence = repo.create(card_id, input).await?;
    Ok((StatusCode::CREATED, Json(evidence)))
}

async fn delete_evidence(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let repo = EvidenceRepository::new(state.pool());
    if repo.delete(id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

#[derive(Debug, Deserialize)]
struct CreateEvidenceRequest {
    source_type: String,
    #[serde(default)]
    source_uri: Option<String>,
    #[serde(default)]
    excerpt: Option<String>,
    #[serde(default)]
    credibility: Option<i32>,
}
