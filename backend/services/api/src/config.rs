use std::{net::SocketAddr, time::Duration};

use anyhow::Context;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub bind_address: SocketAddr,
    pub database_url: String,
    pub llm: LlmSettings,
}

#[derive(Clone, Debug)]
pub struct LlmSettings {
    pub provider: LlmProviderConfig,
    pub timeout: Duration,
}

#[derive(Clone, Debug)]
pub enum LlmProviderConfig {
    Remote(RemoteLlmConfig),
    Ollama(OllamaConfig),
}

#[derive(Clone, Debug)]
pub struct RemoteLlmConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
}

#[derive(Clone, Debug)]
pub struct OllamaConfig {
    pub base_url: String,
    pub model: String,
    pub keep_alive: Option<String>,
    pub options: OllamaOptions,
}

#[derive(Clone, Debug)]
pub struct OllamaOptions {
    pub temperature: f32,
    pub top_p: f32,
    pub repeat_penalty: f32,
    pub num_predict: Option<u32>,
    pub num_ctx: Option<u32>,
    pub num_threads: Option<u32>,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let bind_address = std::env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
            .parse()
            .context("invalid BIND_ADDRESS")?;

        let database_url =
            std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://./knowflow.db".to_string());

        let llm = LlmSettings::from_env();

        Ok(Self {
            bind_address,
            database_url,
            llm,
        })
    }
}

impl LlmSettings {
    fn from_env() -> Self {
        let provider_label = std::env::var("LLM_PROVIDER")
            .unwrap_or_else(|_| "remote".to_string())
            .to_lowercase();
        let timeout_secs = std::env::var("LLM_TIMEOUT_SECS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(30);

        let provider = match provider_label.as_str() {
            "ollama" | "local" => LlmProviderConfig::Ollama(OllamaConfig::from_env()),
            _ => LlmProviderConfig::Remote(RemoteLlmConfig::from_env()),
        };

        Self {
            provider,
            timeout: Duration::from_secs(timeout_secs),
        }
    }
}

impl RemoteLlmConfig {
    fn from_env() -> Self {
        let base_url =
            std::env::var("LLM_API_BASE").unwrap_or_else(|_| "https://api.openai.com".to_string());
        let api_key = std::env::var("LLM_API_KEY").ok();
        let model = std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());

        Self {
            base_url,
            api_key,
            model,
        }
    }
}

impl OllamaConfig {
    fn from_env() -> Self {
        let base_url = std::env::var("OLLAMA_API_BASE")
            .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());
        let model = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "llama3".to_string());
        let keep_alive = std::env::var("OLLAMA_KEEP_ALIVE").ok();

        let options = OllamaOptions {
            temperature: parse_env("OLLAMA_TEMPERATURE").unwrap_or(0.2),
            top_p: parse_env("OLLAMA_TOP_P").unwrap_or(0.95),
            repeat_penalty: parse_env("OLLAMA_REPEAT_PENALTY").unwrap_or(1.08),
            num_predict: parse_env("OLLAMA_NUM_PREDICT"),
            num_ctx: parse_env("OLLAMA_NUM_CTX"),
            num_threads: parse_env("OLLAMA_NUM_THREADS"),
        };

        Self {
            base_url,
            model,
            keep_alive,
            options,
        }
    }
}

fn parse_env<T: std::str::FromStr>(key: &str) -> Option<T> {
    std::env::var(key).ok().and_then(|value| value.parse().ok())
}
