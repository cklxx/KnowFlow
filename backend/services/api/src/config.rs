use std::{net::SocketAddr, time::Duration};

use anyhow::Context;
use reqwest::Client;
use serde::Deserialize;
use tracing::{debug, info, warn};

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

    pub async fn with_llm_autodetect(mut self) -> anyhow::Result<Self> {
        let provider_override = std::env::var_os("LLM_PROVIDER");

        // Always attempt to discover a local Ollama runtime. If one is present
        // we can either switch providers automatically (when no explicit
        // provider was requested) or validate the configured model name.
        let candidate_base_url = std::env::var("OLLAMA_API_BASE")
            .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());

        if let Some(detected) = detect_ollama_runtime(&candidate_base_url).await? {
            if detected.models.is_empty() {
                warn!(
                    base_url = %candidate_base_url,
                    "ollama runtime detected but no models are available"
                );
            }

            match &mut self.llm.provider {
                LlmProviderConfig::Ollama(config) => {
                    apply_detected_models(config, &detected.models);
                }
                _ => {
                    if provider_override.is_none() && !detected.models.is_empty() {
                        let mut config = OllamaConfig::from_env();
                        config.base_url = candidate_base_url;
                        apply_detected_models(&mut config, &detected.models);
                        info!(
                            base_url = %config.base_url,
                            model = %config.model,
                            "detected local ollama runtime, enabling ollama provider"
                        );
                        self.llm.provider = LlmProviderConfig::Ollama(config);
                    }
                }
            }
        } else {
            debug!(
                base_url = %candidate_base_url,
                "no reachable ollama runtime detected"
            );
        }

        Ok(self)
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

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaTag>,
}

#[derive(Debug, Deserialize)]
struct OllamaTag {
    name: String,
}

#[derive(Debug)]
struct DetectedOllamaRuntime {
    models: Vec<String>,
}

async fn detect_ollama_runtime(base_url: &str) -> anyhow::Result<Option<DetectedOllamaRuntime>> {
    let client = match Client::builder().timeout(Duration::from_secs(2)).build() {
        Ok(client) => client,
        Err(err) => {
            debug!(error = %err, "failed to build HTTP client for ollama detection");
            return Ok(None);
        }
    };

    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(err) => {
            debug!(error = %err, "failed to reach ollama runtime");
            return Ok(None);
        }
    };

    if !response.status().is_success() {
        debug!(
            status = %response.status(),
            "ollama runtime responded with non-success status"
        );
        return Ok(None);
    }

    let payload: OllamaTagsResponse = match response.json().await {
        Ok(payload) => payload,
        Err(err) => {
            debug!(error = %err, "failed to decode ollama tags response");
            return Ok(None);
        }
    };

    let models = payload.models.into_iter().map(|tag| tag.name).collect();

    Ok(Some(DetectedOllamaRuntime { models }))
}

fn apply_detected_models(config: &mut OllamaConfig, detected_models: &[String]) {
    if detected_models.is_empty() {
        return;
    }

    let env_model_override = std::env::var_os("OLLAMA_MODEL").is_some();
    if let Some(matching) = find_matching_model(detected_models, &config.model) {
        config.model = matching.to_string();
        return;
    }

    if env_model_override {
        warn!(
            configured = %config.model,
            available = ?detected_models,
            "configured OLLAMA_MODEL was not found; falling back to detected model"
        );
    }

    if let Some(first) = detected_models.first() {
        config.model = first.clone();
    }
}

fn find_matching_model<'a>(models: &'a [String], target: &str) -> Option<&'a String> {
    models.iter().find(|model| model == &&target).or_else(|| {
        models
            .iter()
            .find(|model| model.split(':').next() == Some(target))
    })
}
