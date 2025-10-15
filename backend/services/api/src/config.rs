use std::{net::SocketAddr, time::Duration};

use anyhow::Context;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub bind_address: SocketAddr,
    pub database_url: String,
    pub llm: LlmConfig,
}

#[derive(Clone, Debug)]
pub struct LlmConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub timeout: Duration,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let bind_address = std::env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
            .parse()
            .context("invalid BIND_ADDRESS")?;

        let database_url =
            std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://./knowflow.db".to_string());

        let llm = LlmConfig::from_env();

        Ok(Self {
            bind_address,
            database_url,
            llm,
        })
    }
}

impl LlmConfig {
    fn from_env() -> Self {
        let base_url =
            std::env::var("LLM_API_BASE").unwrap_or_else(|_| "https://api.openai.com".to_string());
        let api_key = std::env::var("LLM_API_KEY").ok();
        let model = std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());
        let timeout_secs = std::env::var("LLM_TIMEOUT_SECS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(30);

        Self {
            base_url,
            api_key,
            model,
            timeout: Duration::from_secs(timeout_secs),
        }
    }
}
