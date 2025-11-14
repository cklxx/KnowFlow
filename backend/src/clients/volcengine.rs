use crate::error::{AppError, Result};
use base64::Engine;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Clone)]
pub struct VolcengineClient {
    client: Client,
    base_url: Url,
    chat_model: String,
    tts_voice: String,
}

impl VolcengineClient {
    pub fn new(
        base_url: Url,
        api_key: String,
        chat_model: String,
        tts_voice: String,
    ) -> Result<Self> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {api_key}"))
                .map_err(|_| AppError::Config("invalid VOLCENGINE_API_KEY".to_string()))?,
        );

        let client = Client::builder()
            .default_headers(headers)
            .build()
            .map_err(|err| AppError::Config(format!("failed to construct http client: {err}")))?;

        Ok(Self {
            client,
            base_url,
            chat_model,
            tts_voice,
        })
    }

    pub async fn chat_completion(&self, prompt: &str) -> Result<String> {
        let url = self
            .base_url
            .join("/api/v1/chat/completions")
            .map_err(|err| AppError::Config(format!("invalid chat endpoint: {err}")))?;

        let request = ChatCompletionRequest {
            model: self.chat_model.clone(),
            input: vec![ChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
        };

        let response: ChatCompletionResponse = self
            .client
            .post(url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        response
            .choices
            .into_iter()
            .next()
            .and_then(|choice| choice.message.content)
            .ok_or_else(|| {
                AppError::Upstream("volcengine chat response missing content".to_string())
            })
    }

    pub async fn text_to_speech(&self, text: &str) -> Result<Vec<u8>> {
        let url = self
            .base_url
            .join("/api/v1/tts")
            .map_err(|err| AppError::Config(format!("invalid tts endpoint: {err}")))?;

        let request = TtsRequest {
            text: text.to_string(),
            voice: self.tts_voice.clone(),
            format: "mp3".to_string(),
        };

        let response: TtsResponse = self
            .client
            .post(url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        let engine = base64::engine::general_purpose::STANDARD;
        engine
            .decode(response.audio_base64)
            .map_err(|err| AppError::Upstream(format!("failed to decode volcengine audio: {err}")))
    }
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    input: Vec<ChatMessage>,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatCompletionMessage,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionMessage {
    content: Option<String>,
}

#[derive(Debug, Serialize)]
struct TtsRequest {
    text: String,
    voice: String,
    format: String,
}

#[derive(Debug, Deserialize)]
struct TtsResponse {
    audio_base64: String,
}
