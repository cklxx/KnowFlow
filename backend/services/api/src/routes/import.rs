use axum::{extract::State, routing::post, Json, Router};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};
use crate::services::import::{
    build_import_preview, ImportPreview, ImportPreviewOptions, ImportSource, ImportSourceKind,
};
use crate::services::llm::{GeneratedCardDraft, MAX_GENERATION_TARGET};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/import/preview", post(preview_import))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ImportSourceKindDto {
    Url,
    Markdown,
    Text,
    Code,
}

#[derive(Debug, Deserialize)]
struct ImportSourceDto {
    #[serde(default)]
    title: Option<String>,
    content: String,
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default = "default_source_kind")]
    kind: ImportSourceKindDto,
}

#[derive(Debug, Deserialize)]
struct ImportPreviewRequest {
    #[serde(default)]
    direction_name: Option<String>,
    #[serde(default)]
    language: Option<String>,
    #[serde(default = "default_desired_cards")]
    desired_cards_per_cluster: usize,
    #[serde(default)]
    sources: Vec<ImportSourceDto>,
}

#[derive(Debug, Serialize)]
struct ImportPreviewResponse {
    clusters: Vec<ImportPreviewClusterDto>,
}

#[derive(Debug, Serialize)]
struct ImportPreviewClusterDto {
    id: String,
    topic: String,
    summary: String,
    materials: Vec<ImportPreviewMaterialDto>,
    drafts: Vec<GeneratedCardDraft>,
}

#[derive(Debug, Serialize)]
struct ImportPreviewMaterialDto {
    id: String,
    title: String,
    snippet: String,
    kind: String,
    source_url: Option<String>,
    tags: Vec<String>,
}

async fn preview_import(
    State(state): State<AppState>,
    Json(payload): Json<ImportPreviewRequest>,
) -> AppResult<Json<ImportPreviewResponse>> {
    let desired_cards = payload
        .desired_cards_per_cluster
        .clamp(1, MAX_GENERATION_TARGET);

    let sources: Vec<ImportSource> = payload
        .sources
        .into_iter()
        .map(|source| ImportSource {
            title: source.title.and_then(trimmed_optional),
            content: source.content.trim().to_string(),
            url: source.url.and_then(trimmed_optional),
            tags: source
                .tags
                .into_iter()
                .map(|tag| tag.trim().to_string())
                .filter(|tag| !tag.is_empty())
                .collect(),
            kind: source.kind.into(),
        })
        .filter(|source| !source.content.is_empty() || source.url.is_some())
        .collect();

    let preview = build_import_preview(
        state.llm(),
        sources,
        ImportPreviewOptions {
            direction_name: payload.direction_name.and_then(trimmed_optional),
            language: payload.language.and_then(trimmed_optional),
            desired_cards_per_cluster: desired_cards,
        },
    )
    .await
    .map_err(|err| AppError::Other(err.to_string()))?;

    Ok(Json(ImportPreviewResponse::from(preview)))
}

impl From<ImportPreview> for ImportPreviewResponse {
    fn from(value: ImportPreview) -> Self {
        Self {
            clusters: value
                .clusters
                .into_iter()
                .map(|cluster| ImportPreviewClusterDto {
                    id: cluster.id,
                    topic: cluster.topic,
                    summary: cluster.summary,
                    materials: cluster
                        .materials
                        .into_iter()
                        .map(|material| ImportPreviewMaterialDto {
                            id: material.id,
                            title: material.title,
                            snippet: material.snippet,
                            kind: material.kind,
                            source_url: material.source_url,
                            tags: material.tags,
                        })
                        .collect(),
                    drafts: cluster.drafts,
                })
                .collect(),
        }
    }
}

impl From<ImportSourceKindDto> for ImportSourceKind {
    fn from(value: ImportSourceKindDto) -> Self {
        match value {
            ImportSourceKindDto::Url => ImportSourceKind::Url,
            ImportSourceKindDto::Markdown => ImportSourceKind::Markdown,
            ImportSourceKindDto::Text => ImportSourceKind::Text,
            ImportSourceKindDto::Code => ImportSourceKind::Code,
        }
    }
}

const fn default_desired_cards() -> usize {
    3
}

fn default_source_kind() -> ImportSourceKindDto {
    ImportSourceKindDto::Text
}

fn trimmed_optional(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}
