use anyhow::Result;
use serde::Serialize;
use uuid::Uuid;

use crate::services::llm::{
    CardDraftGenerationInput, GeneratedCardDraft, LlmClient, MaterialChunk,
};

#[derive(Debug, Clone)]
pub struct ImportSource {
    pub title: Option<String>,
    pub content: String,
    pub url: Option<String>,
    pub tags: Vec<String>,
    pub kind: ImportSourceKind,
}

#[derive(Debug, Clone, Copy)]
pub enum ImportSourceKind {
    Url,
    Markdown,
    Text,
    Code,
}

impl ImportSourceKind {
    fn as_str(&self) -> &'static str {
        match self {
            ImportSourceKind::Url => "url",
            ImportSourceKind::Markdown => "markdown",
            ImportSourceKind::Text => "text",
            ImportSourceKind::Code => "code",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ImportPreviewOptions {
    pub direction_name: Option<String>,
    pub language: Option<String>,
    pub desired_cards_per_cluster: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportPreview {
    pub clusters: Vec<ImportPreviewCluster>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportPreviewCluster {
    pub id: String,
    pub topic: String,
    pub summary: String,
    pub materials: Vec<ImportPreviewMaterial>,
    pub drafts: Vec<GeneratedCardDraft>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportPreviewMaterial {
    pub id: String,
    pub title: String,
    pub snippet: String,
    pub kind: String,
    pub source_url: Option<String>,
    pub tags: Vec<String>,
}

pub async fn build_import_preview(
    llm: &LlmClient,
    sources: Vec<ImportSource>,
    options: ImportPreviewOptions,
) -> Result<ImportPreview> {
    let mut clusters: Vec<ClusterAccumulator> = Vec::new();

    for source in sources.into_iter() {
        let key = cluster_key(&source);
        if let Some(existing) = clusters.iter_mut().find(|cluster| cluster.key == key) {
            existing.add_source(source);
        } else {
            let mut accumulator = ClusterAccumulator::new(key.clone());
            accumulator.add_source(source);
            clusters.push(accumulator);
        }
    }

    let mut preview_clusters = Vec::with_capacity(clusters.len());

    for cluster in clusters {
        let topic = cluster.topic();
        let summary = cluster.summary();
        let materials = cluster.preview_materials();
        let material_chunks = cluster.material_chunks();

        let drafts = if material_chunks.is_empty() {
            Vec::new()
        } else {
            llm.generate_card_drafts(CardDraftGenerationInput {
                direction_name: options.direction_name.clone(),
                task_context: Some(topic.clone()),
                materials: material_chunks,
                desired_count: options.desired_cards_per_cluster,
                preferred_type: None,
                language: options.language.clone(),
            })
            .await?
        };

        preview_clusters.push(ImportPreviewCluster {
            id: cluster.id,
            topic,
            summary,
            materials,
            drafts,
        });
    }

    Ok(ImportPreview {
        clusters: preview_clusters,
    })
}

struct ClusterAccumulator {
    key: String,
    id: String,
    topic: Option<String>,
    sources: Vec<ImportSource>,
}

impl ClusterAccumulator {
    fn new(key: String) -> Self {
        Self {
            key,
            id: Uuid::new_v4().to_string(),
            topic: None,
            sources: Vec::new(),
        }
    }

    fn add_source(&mut self, source: ImportSource) {
        if self.topic.is_none() {
            self.topic = Some(derive_topic(&source));
        }
        self.sources.push(source);
    }

    fn topic(&self) -> String {
        self.topic
            .clone()
            .unwrap_or_else(|| "Imported Collection".to_string())
    }

    fn summary(&self) -> String {
        let mut combined = String::new();
        for source in &self.sources {
            if let Some(title) = &source.title {
                if !title.trim().is_empty() {
                    combined.push_str(title.trim());
                    combined.push_str(": ");
                }
            }
            let snippet = first_meaningful_line(&source.content);
            if !snippet.is_empty() {
                combined.push_str(&snippet);
            }
            combined.push_str("\n");
        }
        truncate(&combined, 220)
    }

    fn preview_materials(&self) -> Vec<ImportPreviewMaterial> {
        self.sources
            .iter()
            .map(|source| ImportPreviewMaterial {
                id: Uuid::new_v4().to_string(),
                title: derive_topic(source),
                snippet: truncate(&source.content, 200),
                kind: source.kind.as_str().to_string(),
                source_url: source.url.clone(),
                tags: source.tags.clone(),
            })
            .collect()
    }

    fn material_chunks(&self) -> Vec<MaterialChunk> {
        self.sources
            .iter()
            .map(|source| MaterialChunk {
                title: source.title.clone().or_else(|| {
                    if let Some(tag) = source.tags.first() {
                        if !tag.trim().is_empty() {
                            return Some(tag.trim().to_string());
                        }
                    }
                    Some(derive_topic(source))
                }),
                content: truncate(&source.content, 1600),
                source: source.url.clone(),
            })
            .collect()
    }
}

fn cluster_key(source: &ImportSource) -> String {
    if let Some(tag) = source.tags.first() {
        let slug = slugify(tag);
        if !slug.is_empty() {
            return slug;
        }
    }
    if let Some(title) = &source.title {
        let slug = slugify(title);
        if !slug.is_empty() {
            return slug;
        }
    }
    let fallback = first_meaningful_line(&source.content);
    let slug = slugify(&fallback);
    if slug.is_empty() {
        "cluster".to_string()
    } else {
        slug
    }
}

fn derive_topic(source: &ImportSource) -> String {
    if let Some(title) = &source.title {
        if !title.trim().is_empty() {
            return title.trim().to_string();
        }
    }
    if let Some(tag) = source.tags.first() {
        if !tag.trim().is_empty() {
            return tag.trim().to_string();
        }
    }
    let line = first_meaningful_line(&source.content);
    if line.is_empty() {
        "Imported Snippet".to_string()
    } else {
        capitalize(&line)
    }
}

fn first_meaningful_line(content: &str) -> String {
    content
        .lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .map(|line| truncate(line, 160))
        .unwrap_or_default()
}

fn truncate(value: &str, max_len: usize) -> String {
    let mut result = String::new();
    let mut count = 0;
    for ch in value.chars() {
        if count >= max_len {
            result.push('…');
            break;
        }
        result.push(ch);
        count += 1;
    }
    result
}

fn slugify(input: &str) -> String {
    let mut slug = String::new();
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
        } else if ch.is_whitespace() && !slug.ends_with('-') {
            slug.push('-');
        }
    }
    slug.trim_matches('-').to_string()
}

fn capitalize(input: &str) -> String {
    let mut chars = input.chars();
    if let Some(first) = chars.next() {
        let mut result = String::new();
        result.extend(first.to_uppercase());
        result.push_str(chars.as_str());
        result
    } else {
        input.to_string()
    }
}
