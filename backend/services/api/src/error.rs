use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("not found")]
    NotFound,
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("internal error: {0}")]
    Other(String),
}

#[derive(Serialize)]
struct ErrorPayload {
    error: &'static str,
    message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, code) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "not_found"),
            AppError::Validation(_) => (StatusCode::BAD_REQUEST, "validation_error"),
            AppError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "database_error"),
            AppError::Other(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
        };

        let message = self.to_string();
        let payload = ErrorPayload {
            error: code,
            message,
        };
        (status, Json(payload)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
