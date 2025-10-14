mod directions;
mod health;
mod memory_cards;
mod skill_points;

use axum::Router;
use tower_http::cors::{Any, CorsLayer};

use crate::state::AppState;

pub fn build_router(state: AppState) -> Router {
    Router::<AppState>::new()
        .merge(health::router())
        .merge(directions::router())
        .merge(skill_points::router())
        .merge(memory_cards::router())
        .layer(cors())
        .with_state(state)
}

fn cors() -> CorsLayer {
    CorsLayer::new()
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
        ])
        .allow_origin(Any)
        .allow_headers(Any)
}
