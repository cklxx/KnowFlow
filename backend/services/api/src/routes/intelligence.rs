use axum::{extract::State, routing::post, Json, Router};
use serde::{Deserialize, Serialize};

use crate::domain::CardType;
use crate::error::{AppError, AppResult};
use crate::services::llm::{CardDraftGenerationInput, GeneratedCardDraft, MaterialChunk};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/intelligence/card-drafts", post(generate_card_drafts))
}

#[derive(Debug, Deserialize)]
struct GenerateCardDraftsRequest {
    #[serde(default)]
    direction_name: Option<String>,
    #[serde(default)]
    task_context: Option<String>,
    #[serde(default)]
    materials: Vec<MaterialInput>,
    #[serde(default)]
    preferred_card_type: Option<CardType>,
    #[serde(default = "default_target_count")]
    desired_count: usize,
    #[serde(default)]
    language: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MaterialInput {
    #[serde(default)]
    title: Option<String>,
    content: String,
    #[serde(default)]
    source: Option<String>,
}

#[derive(Debug, Serialize)]
struct GenerateCardDraftsResponse {
    drafts: Vec<GeneratedCardDraft>,
}

async fn generate_card_drafts(
    State(state): State<AppState>,
    Json(payload): Json<GenerateCardDraftsRequest>,
) -> AppResult<Json<GenerateCardDraftsResponse>> {
    let llm_input = CardDraftGenerationInput {
        direction_name: payload.direction_name,
        task_context: payload.task_context,
        materials: payload
            .materials
            .into_iter()
            .map(|material| MaterialChunk {
                title: material.title,
                content: material.content,
                source: material.source,
            })
            .collect(),
        desired_count: payload.desired_count,
        preferred_type: payload.preferred_card_type,
        language: payload.language,
    };

    let drafts = state
        .llm()
        .generate_card_drafts(llm_input)
        .await
        .map_err(|err| AppError::Other(err.to_string()))?;

    Ok(Json(GenerateCardDraftsResponse { drafts }))
}

const fn default_target_count() -> usize {
    5
}
