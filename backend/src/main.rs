use backend::clients::volcengine::VolcengineClient;
use backend::config::Config;
use backend::error::{AppError, Result};
use backend::routes::{create_router, AppState};
use backend::services::aggregator::Aggregator;
use backend::services::assets::AssetStore;
use backend::services::digest::DigestService;
use backend::services::summarizer::Summarizer;
use backend::services::tts::TtsService;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    if let Err(err) = run().await {
        tracing::error!(?err, "application error");
    }
}

async fn run() -> Result<()> {
    init_tracing();

    let config = Config::from_env()?;
    let aggregator = Aggregator::new(config.rss_feeds.clone(), config.daily_items * 3)?;

    let volcengine_client = match config.volcengine_api_key.clone() {
        Some(api_key) => Some(VolcengineClient::new(
            config.volcengine_base_url.clone(),
            api_key,
            config.volcengine_chat_model.clone(),
            config.volcengine_tts_voice.clone(),
        )?),
        None => {
            tracing::warn!("VOLCENGINE_API_KEY not set; falling back to offline summaries");
            None
        }
    };

    let summarizer = Summarizer::new(volcengine_client.clone());
    let tts_service = volcengine_client.clone().map(TtsService::new);
    let asset_store = AssetStore::new(config.asset_dir.clone(), config.static_url_prefix.clone());
    let digest_service = DigestService::new(
        aggregator,
        summarizer,
        tts_service,
        config.daily_items,
        asset_store,
    );

    let state = AppState {
        digest_service: Arc::new(digest_service),
        asset_dir: config.asset_dir.clone(),
    };

    let router = create_router(state);

    let addr = env_address();
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|err| AppError::Unexpected(format!("failed to bind {addr}: {err}")))?;

    tracing::info!("listening on {addr}");

    axum::serve(listener, router)
        .await
        .map_err(|err| AppError::Unexpected(format!("server error: {err}")))
}

fn env_address() -> String {
    std::env::var("BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".to_string())
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
}
