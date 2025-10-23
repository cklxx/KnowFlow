use std::fmt::Write;
use std::str::FromStr;

use anyhow::{anyhow, Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::warn;

use crate::config::{LlmProviderConfig, LlmSettings, OllamaConfig, RemoteLlmConfig};
use crate::domain::{CardType, MemoryCardDraft};

pub(crate) const MAX_GENERATION_TARGET: usize = 8;

#[derive(Clone)]
pub struct LlmClient {
    http: Client,
    settings: LlmSettings,
}

#[derive(Debug, Clone)]
pub struct CardDraftGenerationInput {
    pub direction_name: Option<String>,
    pub task_context: Option<String>,
    pub materials: Vec<MaterialChunk>,
    pub desired_count: usize,
    pub preferred_type: Option<CardType>,
    pub language: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MaterialChunk {
    pub title: Option<String>,
    pub content: String,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GeneratedCardDraft {
    pub draft: MemoryCardDraft,
    pub rationale: String,
    pub confidence: f32,
}

impl LlmClient {
    pub fn new(settings: LlmSettings) -> Result<Self> {
        let http = Client::builder()
            .timeout(settings.timeout)
            .build()
            .context("failed to build HTTP client")?;

        Ok(Self { http, settings })
    }

    pub async fn generate_card_drafts(
        &self,
        input: CardDraftGenerationInput,
    ) -> Result<Vec<GeneratedCardDraft>> {
        let target_count = input.desired_count.clamp(1, MAX_GENERATION_TARGET);

        match &self.settings.provider {
            LlmProviderConfig::Remote(remote) => {
                if remote.api_key.is_none() {
                    return Ok(fallback_drafts(&input, target_count));
                }

                match self.call_remote(remote, &input, target_count).await {
                    Ok(drafts) if !drafts.is_empty() => Ok(drafts),
                    Ok(_) => Ok(fallback_drafts(&input, target_count)),
                    Err(err) => {
                        warn!(error = %err, provider = "remote", "llm generation failed, using fallback drafts");
                        Ok(fallback_drafts(&input, target_count))
                    }
                }
            }
            LlmProviderConfig::Ollama(local) => {
                match self.call_ollama(local, &input, target_count).await {
                    Ok(drafts) if !drafts.is_empty() => Ok(drafts),
                    Ok(_) => Ok(fallback_drafts(&input, target_count)),
                    Err(err) => {
                        warn!(error = %err, provider = "ollama", "llm generation failed, using fallback drafts");
                        Ok(fallback_drafts(&input, target_count))
                    }
                }
            }
        }
    }

    async fn call_remote(
        &self,
        config: &RemoteLlmConfig,
        input: &CardDraftGenerationInput,
        target_count: usize,
    ) -> Result<Vec<GeneratedCardDraft>> {
        let api_key = config
            .api_key
            .as_ref()
            .ok_or_else(|| anyhow!("missing LLM_API_KEY configuration"))?;

        let url = format!(
            "{}/v1/chat/completions",
            config.base_url.trim_end_matches('/')
        );

        let request = ChatCompletionRequest {
            model: config.model.clone(),
            temperature: 0.2,
            messages: vec![
                ChatMessage {
                    role: "system",
                    content: system_prompt(),
                },
                ChatMessage {
                    role: "user",
                    content: build_user_prompt(input),
                },
            ],
        };

        let response = self
            .http
            .post(url)
            .bearer_auth(api_key)
            .json(&request)
            .send()
            .await
            .context("failed to send request to LLM provider")?
            .error_for_status()
            .context("LLM provider returned error status")?
            .json::<ChatCompletionResponse>()
            .await
            .context("failed to decode LLM response")?;

        let Some(content) = response
            .choices
            .into_iter()
            .find_map(|choice| choice.message.content)
        else {
            return Ok(Vec::new());
        };

        parse_model_output(
            &content,
            input.preferred_type.unwrap_or(CardType::Concept),
            target_count,
        )
    }

    async fn call_ollama(
        &self,
        config: &OllamaConfig,
        input: &CardDraftGenerationInput,
        target_count: usize,
    ) -> Result<Vec<GeneratedCardDraft>> {
        let url = format!("{}/api/chat", config.base_url.trim_end_matches('/'));

        let request = OllamaChatRequest {
            model: config.model.clone(),
            stream: false,
            keep_alive: config.keep_alive.clone(),
            messages: vec![
                OllamaChatMessage {
                    role: "system".to_string(),
                    content: system_prompt(),
                },
                OllamaChatMessage {
                    role: "user".to_string(),
                    content: build_user_prompt(input),
                },
            ],
            options: Some(build_ollama_options(config, target_count)),
        };

        let response = self
            .http
            .post(url)
            .json(&request)
            .send()
            .await
            .context("failed to send request to Ollama")?
            .error_for_status()
            .context("Ollama returned error status")?
            .json::<OllamaChatResponse>()
            .await
            .context("failed to decode Ollama response")?;

        let content = response
            .message
            .map(|message| message.content)
            .or(response.response)
            .ok_or_else(|| anyhow!("Ollama response did not contain assistant message"))?;

        parse_model_output(
            &content,
            input.preferred_type.unwrap_or(CardType::Concept),
            target_count,
        )
    }
}

fn fallback_drafts(input: &CardDraftGenerationInput, target: usize) -> Vec<GeneratedCardDraft> {
    let fallback_type = input.preferred_type.unwrap_or(CardType::Concept);

    input
        .materials
        .iter()
        .take(target)
        .map(|material| {
            let title = material
                .title
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| fallback_title(&material.content));
            let body = truncate(&material.content, 420);

            let draft = MemoryCardDraft {
                skill_point_id: None,
                title,
                body: body.to_string(),
                card_type: fallback_type,
                stability: None,
                relevance: None,
                novelty: None,
                priority: None,
                next_due: None,
            };

            GeneratedCardDraft {
                draft,
                rationale: material
                    .source
                    .clone()
                    .unwrap_or_else(|| "Heuristic summary from provided material".to_string()),
                confidence: 0.25,
            }
        })
        .collect()
}

fn build_user_prompt(input: &CardDraftGenerationInput) -> String {
    let mut prompt = String::new();
    let preferred_type = input
        .preferred_type
        .map(|kind| kind.as_str().to_string())
        .unwrap_or_else(|| "concept".to_string());

    writeln!(
        &mut prompt,
        "Generate up to {} memory card drafts in JSON format.",
        input.desired_count
    )
    .ok();
    writeln!(
        &mut prompt,
        "Each draft must have: title, body, card_type, rationale, confidence."
    )
    .ok();
    writeln!(
        &mut prompt,
        "Use card_type values fact|concept|procedure|claim. Prefer `{}` when unsure.",
        preferred_type
    )
    .ok();

    if let Some(direction_name) = &input.direction_name {
        writeln!(&mut prompt, "Direction: {direction_name}").ok();
    }

    if let Some(task_context) = &input.task_context {
        writeln!(&mut prompt, "Current focus: {task_context}").ok();
    }

    if let Some(language) = &input.language {
        writeln!(
            &mut prompt,
            "Write titles and bodies in {} language.",
            language
        )
        .ok();
    }

    if input.materials.is_empty() {
        writeln!(
            &mut prompt,
            "No materials provided; infer helpful foundational cards."
        )
        .ok();
    } else {
        writeln!(&mut prompt, "Materials:").ok();
        for (idx, material) in input.materials.iter().enumerate() {
            let display_title = material
                .title
                .as_deref()
                .unwrap_or_else(|| "Untitled excerpt");
            let source = material.source.as_deref().unwrap_or("");
            let snippet = truncate(&material.content, 1600);
            writeln!(
                &mut prompt,
                "[{index}] {title} {source}\n{snippet}\n",
                index = idx + 1,
                title = display_title,
                source = source
            )
            .ok();
        }
    }

    prompt
}

fn system_prompt() -> String {
    "You are an assistant that transforms study materials into spaced-repetition memory cards. respond with strict JSON only.".to_string()
}

fn parse_model_output(
    content: &str,
    fallback_type: CardType,
    target_count: usize,
) -> Result<Vec<GeneratedCardDraft>> {
    let Some(json_fragment) = sanitize_json_block(content) else {
        return Err(anyhow!("LLM response did not contain JSON payload"));
    };

    let envelope: ModelEnvelope =
        serde_json::from_str(&json_fragment).context("failed to parse LLM JSON payload")?;

    let drafts = envelope
        .drafts
        .into_iter()
        .filter_map(|raw| raw.try_into_generated(fallback_type).ok())
        .take(target_count)
        .collect::<Vec<_>>();

    if drafts.is_empty() {
        Err(anyhow!("LLM returned empty drafts"))
    } else {
        Ok(drafts)
    }
}

fn sanitize_json_block(content: &str) -> Option<String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Some(stripped) = trimmed.strip_prefix("```json") {
        let inner = stripped.trim_end_matches("```").trim();
        return Some(inner.to_string());
    }

    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            return Some(trimmed[start..=end].to_string());
        }
    }

    None
}

fn fallback_title(content: &str) -> String {
    let first_line = content
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or("Insight");
    let words: Vec<&str> = first_line.split_whitespace().take(12).collect();
    if words.is_empty() {
        "Key Insight".to_string()
    } else {
        words.join(" ")
    }
}

fn truncate(content: &str, max_len: usize) -> String {
    if content.chars().count() <= max_len {
        content.trim().to_string()
    } else {
        let truncated: String = content.chars().take(max_len).collect();
        format!("{}…", truncated.trim_end())
    }
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessageResponse,
}

#[derive(Deserialize)]
struct ChatMessageResponse {
    content: Option<String>,
}

#[derive(Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaChatMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    keep_alive: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptionsPayload>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OllamaChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    #[serde(default)]
    message: Option<OllamaChatMessage>,
    #[serde(default)]
    response: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct OllamaOptionsPayload {
    temperature: f32,
    top_p: f32,
    #[serde(rename = "repeat_penalty")]
    repeat_penalty: f32,
    #[serde(rename = "num_ctx", skip_serializing_if = "Option::is_none")]
    num_ctx: Option<u32>,
    #[serde(rename = "num_predict", skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>,
    #[serde(rename = "num_thread", skip_serializing_if = "Option::is_none")]
    num_threads: Option<u32>,
}

fn build_ollama_options(config: &OllamaConfig, target_count: usize) -> OllamaOptionsPayload {
    let options = &config.options;
    let auto_predict = options.num_predict.or_else(|| {
        let predicted = (target_count as u32).saturating_mul(256).clamp(256, 4096);
        Some(predicted)
    });

    OllamaOptionsPayload {
        temperature: options.temperature,
        top_p: options.top_p,
        repeat_penalty: options.repeat_penalty,
        num_ctx: options.num_ctx,
        num_predict: auto_predict,
        num_threads: options.num_threads,
    }
}

#[derive(Debug, Deserialize)]
struct ModelEnvelope {
    drafts: Vec<ModelDraft>,
}

#[derive(Debug, Deserialize)]
struct ModelDraft {
    title: String,
    body: String,
    #[serde(default)]
    card_type: Option<String>,
    #[serde(default)]
    rationale: Option<String>,
    #[serde(default)]
    confidence: Option<f32>,
}

impl ModelDraft {
    fn try_into_generated(self, fallback_type: CardType) -> Result<GeneratedCardDraft> {
        let card_type = self
            .card_type
            .as_deref()
            .and_then(|value| CardType::from_str(value).ok())
            .unwrap_or(fallback_type);

        if self.title.trim().is_empty() || self.body.trim().is_empty() {
            return Err(anyhow!("missing title or body"));
        }

        let draft = MemoryCardDraft {
            skill_point_id: None,
            title: self.title,
            body: self.body,
            card_type,
            stability: None,
            relevance: None,
            novelty: None,
            priority: None,
            next_due: None,
        };

        Ok(GeneratedCardDraft {
            draft,
            rationale: self
                .rationale
                .unwrap_or_else(|| "Model suggested for relevance".to_string()),
            confidence: self.confidence.unwrap_or(0.6).clamp(0.0, 1.0),
        })
    }
}
