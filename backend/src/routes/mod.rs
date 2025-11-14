use std::io::ErrorKind;
use std::path::{Component, Path as StdPath, PathBuf};
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;

use crate::error::{AppError, Result};
use crate::services::digest::DigestService;

use self::digest::today_digest;

use mime_guess::MimeGuess;

pub mod digest;

#[derive(Clone)]
pub struct AppState {
    pub digest_service: Arc<DigestService>,
    pub asset_dir: PathBuf,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/digest/today", get(today_digest))
        .route("/static/*path", get(serve_static))
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

async fn serve_static(State(state): State<AppState>, Path(path): Path<String>) -> Result<Response> {
    if path.is_empty() {
        return Ok(StatusCode::NOT_FOUND.into_response());
    }

    if StdPath::new(&path).components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return Err(AppError::BadRequest(
            "invalid static asset path".to_string(),
        ));
    }

    let relative_path = StdPath::new(&path);
    let full_path = state.asset_dir.join(relative_path);

    match tokio::fs::read(&full_path).await {
        Ok(bytes) => {
            let mime = MimeGuess::from_path(&full_path).first_or_octet_stream();
            build_static_response(bytes, mime)
        }
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(StatusCode::NOT_FOUND.into_response()),
        Err(err) => Err(AppError::Unexpected(format!(
            "failed to read static asset {}: {}",
            full_path.display(),
            err
        ))),
    }
}

fn build_static_response(body: Vec<u8>, mime: mime::Mime) -> Result<Response> {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime.as_ref())
        .header(header::CACHE_CONTROL, "public, max-age=600")
        .body(Body::from(body))
        .map_err(|err| AppError::Unexpected(format!("failed to build static response: {err}")))
}
