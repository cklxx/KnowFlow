mod card_applications;
mod directions;
mod evidence;
mod health;
mod import;
mod intelligence;
mod memory_cards;
mod notifications;
mod onboarding;
mod progress;
mod search;
mod settings;
mod skill_points;
mod sync;
mod today;
mod tree;
mod vault;

use axum::Router;
use tower_http::cors::{Any, CorsLayer};

use crate::state::AppState;

pub fn build_router(state: AppState) -> Router {
    Router::<AppState>::new()
        .merge(health::router())
        .merge(directions::router())
        .merge(skill_points::router())
        .merge(memory_cards::router())
        .merge(card_applications::router())
        .merge(evidence::router())
        .merge(intelligence::router())
        .merge(import::router())
        .merge(onboarding::router())
        .merge(progress::router())
        .merge(today::router())
        .merge(tree::router())
        .merge(vault::router())
        .merge(search::router())
        .merge(sync::router())
        .merge(notifications::router())
        .merge(settings::router())
        .layer(cors())
        .with_state(state)
}

fn cors() -> CorsLayer {
    CorsLayer::new()
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
        ])
        .allow_origin(Any)
        .allow_headers(Any)
}
