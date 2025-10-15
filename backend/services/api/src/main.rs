mod config;
mod db;
mod domain;
mod error;
mod repositories;
mod routes;
mod services;
mod state;

use dotenvy::dotenv;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::AppConfig;
use crate::services::llm::LlmClient;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();
    dotenv().ok();

    let config = AppConfig::from_env()?;
    let pool = db::connect(&config.database_url).await?;
    let llm_client = LlmClient::new(config.llm.clone())?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let state = AppState::new(pool, llm_client);

    let app = routes::build_router(state).layer(TraceLayer::new_for_http());

    tracing::info!(addr = %config.bind_address, "knowflow api listening");

    let listener = tokio::net::TcpListener::bind(config.bind_address).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

fn init_tracing() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "knowflow_api=debug,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();
}
