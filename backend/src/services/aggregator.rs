use crate::error::{AppError, Result};
use crate::models::digest::Article;
use feed_rs::model::Entry;
use feed_rs::parser;
use reqwest::Client;
use std::time::Duration;
use url::Url;

#[derive(Clone)]
pub struct Aggregator {
    client: Client,
    feed_urls: Vec<Url>,
    per_feed_limit: usize,
}

impl Aggregator {
    pub fn new(feed_urls: Vec<Url>, per_feed_limit: usize) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|err| AppError::Config(format!("failed to build rss client: {err}")))?;

        Ok(Self {
            client,
            feed_urls,
            per_feed_limit,
        })
    }

    pub async fn fetch_latest(&self) -> Result<Vec<Article>> {
        let mut articles = Vec::new();

        for feed_url in &self.feed_urls {
            let response = self.client.get(feed_url.clone()).send().await?;
            let bytes = response.bytes().await?;
            let cursor = std::io::Cursor::new(bytes);
            let feed = parser::parse(cursor).map_err(|err| {
                AppError::Upstream(format!("failed to parse feed {feed_url}: {err}"))
            })?;

            for entry in feed.entries.iter().take(self.per_feed_limit) {
                if let Some(article) = Self::map_entry(entry, feed_url) {
                    articles.push(article);
                }
            }
        }

        articles.sort_by(|a, b| b.published_at.cmp(&a.published_at));
        Ok(articles)
    }

    fn map_entry(entry: &Entry, feed_url: &Url) -> Option<Article> {
        let id = if !entry.id.is_empty() {
            entry.id.clone()
        } else {
            entry
                .links
                .first()
                .map(|link| link.href.clone())
                .unwrap_or_else(|| feed_url.as_str().to_string())
        };
        let title = entry.title.as_ref()?.content.clone();
        let link = entry
            .links
            .iter()
            .find(|link| link.rel.is_none() || link.rel.as_deref() == Some("alternate"))
            .map(|link| link.href.clone())
            .unwrap_or_else(|| feed_url.as_str().to_string());

        let summary = entry
            .summary
            .as_ref()
            .map(|sum| sum.content.trim().to_string())
            .filter(|text| !text.is_empty())
            .or_else(|| entry.content.as_ref().and_then(|c| c.body.clone()))
            .unwrap_or_else(|| "这条资讯暂时没有摘要，但我们会在播客里解释给你听。".to_string());

        let published_at = entry.published.or(entry.updated);

        Some(Article {
            id,
            title,
            summary,
            link,
            published_at,
        })
    }
}
