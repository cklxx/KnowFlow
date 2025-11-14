use crate::error::Result;
use crate::models::digest::{Article, DailyDigest, DigestItem};
use crate::services::aggregator::Aggregator;
use crate::services::assets::AssetStore;
use crate::services::summarizer::{Summarizer, Summary};
use crate::services::tts::{TtsOutput, TtsService};
use chrono::Utc;
use tracing::{info, warn};

#[derive(Clone)]
pub struct DigestService {
    aggregator: Aggregator,
    summarizer: Summarizer,
    tts: Option<TtsService>,
    daily_items: usize,
    asset_store: AssetStore,
}

impl DigestService {
    pub fn new(
        aggregator: Aggregator,
        summarizer: Summarizer,
        tts: Option<TtsService>,
        daily_items: usize,
        asset_store: AssetStore,
    ) -> Self {
        Self {
            aggregator,
            summarizer,
            tts,
            daily_items,
            asset_store,
        }
    }

    pub async fn generate_daily(&self) -> Result<DailyDigest> {
        let mut articles = self.aggregator.fetch_latest().await?;
        articles.truncate(self.daily_items);
        info!(count = articles.len(), "fetched articles for digest");

        let mut items = Vec::new();
        let mut briefs = Vec::new();
        let today = Utc::now().date_naive();
        let iso_date = today.to_string();
        let date_slug = today.format("%Y%m%d").to_string();

        for (idx, article) in articles.iter().enumerate() {
            let summary = self.summarizer.summarise(article).await?;
            briefs.push(summary.one_minute.clone());

            let transcript_content = Self::build_transcript(article, &summary);
            let transcript_url = self
                .asset_store
                .write_transcript(&date_slug, idx + 1, &transcript_content)
                .await?;

            let (audio_base64, audio_url) = if let Some(tts) = &self.tts {
                let script = Self::build_script(idx + 1, &summary);
                match tts.synthesize(&script).await {
                    Ok(audio) => self.persist_audio(&date_slug, idx + 1, audio).await,
                    Err(err) => {
                        warn!("failed to synthesize audio: {err}");
                        (None, None)
                    }
                }
            } else {
                (None, None)
            };

            let item = DigestItem {
                title: article.title.clone(),
                headline: summary.headline,
                happened: summary.happened,
                impact: summary.impact,
                actions: summary.actions,
                text_summary: summary.one_minute.clone(),
                audio_base64,
                audio_url,
                transcript_url,
                source_url: article.link.clone(),
                published_at: article.published_at,
            };
            items.push(item);
        }

        let intro = if items.is_empty() {
            "今天没有找到值得一讲的 AI 新闻，我们明天再聊。".to_string()
        } else {
            format!(
                "今天帮你挑了 {} 条 AI 新鲜事，一起用耳朵听听看。",
                items.len()
            )
        };

        let one_minute_brief = if briefs.is_empty() {
            "今天没有新的重点需要关注。".to_string()
        } else {
            briefs.join(" ")
        };

        Ok(DailyDigest {
            date: iso_date,
            intro,
            items,
            one_minute_brief,
        })
    }

    async fn persist_audio(
        &self,
        date_slug: &str,
        index: usize,
        audio: TtsOutput,
    ) -> (Option<String>, Option<String>) {
        match self
            .asset_store
            .write_audio(date_slug, index, &audio.bytes)
            .await
        {
            Ok(url) => (Some(audio.base64), Some(url)),
            Err(err) => {
                warn!("failed to persist audio asset: {err}");
                (Some(audio.base64), None)
            }
        }
    }

    fn build_script(index: usize, summary: &Summary) -> String {
        format!(
            "第{index}条：{headline}。发生了什么：{happened}。和你有什么关系：{impact}。你可以怎么做：{actions}。",
            index = index,
            headline = summary.headline,
            happened = summary.happened.join("，"),
            impact = summary.impact.join("，"),
            actions = summary.actions.join("，")
        )
    }

    fn build_transcript(article: &Article, summary: &Summary) -> String {
        let mut transcript = String::new();
        transcript.push_str(&format!("# {headline}\n\n", headline = summary.headline));
        transcript.push_str(&format!("原文链接：{link}\n\n", link = article.link));

        transcript.push_str("## 🧠 发生了什么？\n");
        for point in &summary.happened {
            transcript.push_str(&format!("- {point}\n"));
        }
        transcript.push('\n');

        transcript.push_str("## 👀 这跟我有什么关系？\n");
        for point in &summary.impact {
            transcript.push_str(&format!("- {point}\n"));
        }
        transcript.push('\n');

        transcript.push_str("## ✅ 我需要做什么？\n");
        for point in &summary.actions {
            transcript.push_str(&format!("- {point}\n"));
        }
        transcript.push('\n');

        transcript.push_str("---\n\n");
        transcript.push_str(&summary.one_minute);
        transcript.push('\n');

        transcript
    }
}
