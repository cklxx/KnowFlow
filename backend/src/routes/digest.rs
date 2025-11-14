use axum::{extract::State, Json};

use crate::error::Result;
use crate::models::digest::DailyDigest;

use super::AppState;

pub async fn today_digest(State(state): State<AppState>) -> Result<Json<DailyDigest>> {
    let digest = state.digest_service.generate_daily().await?;
    Ok(Json(digest))
}
