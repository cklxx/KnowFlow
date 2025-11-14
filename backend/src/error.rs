use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use std::fmt::Display;

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Debug)]
pub enum AppError {
    Config(String),
    Upstream(String),
    BadRequest(String),
    Unexpected(String),
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Config(_) | AppError::Unexpected(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Upstream(_) => StatusCode::BAD_GATEWAY,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        #[derive(Serialize)]
        struct ErrorBody {
            error: String,
        }

        let status = self.status_code();
        let message = self.to_string();
        (status, Json(ErrorBody { error: message })).into_response()
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Config(msg) => write!(f, "configuration error: {msg}"),
            AppError::Upstream(msg) => write!(f, "upstream error: {msg}"),
            AppError::BadRequest(msg) => write!(f, "bad request: {msg}"),
            AppError::Unexpected(msg) => write!(f, "unexpected error: {msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_status() {
            AppError::Upstream(format!("volcengine returned status: {err}"))
        } else if err.is_decode() {
            AppError::Upstream(format!("failed to decode response: {err}"))
        } else if err.is_timeout() {
            AppError::Upstream("request to volcengine timed out".to_string())
        } else {
            AppError::Unexpected(format!("http client error: {err}"))
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Unexpected(format!("io error: {err}"))
    }
}
