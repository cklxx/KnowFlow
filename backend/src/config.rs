use crate::error::{AppError, Result};
use dotenvy::dotenv;
use once_cell::sync::Lazy;
use std::{env, path::PathBuf};
use url::Url;

static DEFAULT_RSS: &str = "https://www.theverge.com/rss/index.xml,https://www.36kr.com/feed";

#[derive(Debug, Clone)]
pub struct Config {
    pub volcengine_api_key: Option<String>,
    pub volcengine_base_url: Url,
    pub volcengine_chat_model: String,
    pub volcengine_tts_voice: String,
    pub rss_feeds: Vec<Url>,
    pub daily_items: usize,
    pub asset_dir: PathBuf,
    pub static_url_prefix: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv().ok();

        let volcengine_api_key = env::var("VOLCENGINE_API_KEY").ok();
        let volcengine_base_url = env::var("VOLCENGINE_BASE_URL")
            .unwrap_or_else(|_| "https://open.volcengineapi.com".to_string());
        let volcengine_chat_model = env::var("VOLCENGINE_CHAT_MODEL")
            .unwrap_or_else(|_| "ep-llama-3-8b-instruct".to_string());
        let volcengine_tts_voice =
            env::var("VOLCENGINE_TTS_VOICE").unwrap_or_else(|_| "zh_female_xiaoyun".to_string());
        let rss_feed_var = env::var("RSS_FEEDS").unwrap_or_else(|_| DEFAULT_RSS.to_string());
        let daily_items = env::var("DAILY_ITEM_COUNT")
            .ok()
            .and_then(|val| val.parse::<usize>().ok())
            .unwrap_or(3);
        let asset_dir = env::var("ASSET_DIR").unwrap_or_else(|_| "static".to_string());
        let static_url_prefix =
            env::var("STATIC_URL_PREFIX").unwrap_or_else(|_| "/static".to_string());

        let rss_feeds = rss_feed_var
            .split(',')
            .filter_map(|raw| Url::parse(raw.trim()).ok())
            .collect::<Vec<_>>();

        let volcengine_base_url = Url::parse(&volcengine_base_url)
            .map_err(|err| AppError::Config(format!("invalid VOLCENGINE_BASE_URL: {err}")))?;

        if rss_feeds.is_empty() {
            return Err(AppError::Config(
                "no valid RSS feeds configured (set RSS_FEEDS)".to_string(),
            ));
        }

        Ok(Self {
            volcengine_api_key,
            volcengine_base_url,
            volcengine_chat_model,
            volcengine_tts_voice,
            rss_feeds,
            daily_items,
            asset_dir: PathBuf::from(asset_dir),
            static_url_prefix,
        })
    }
}

pub static CONFIG: Lazy<Config> = Lazy::new(|| {
    Config::from_env().unwrap_or_else(|err| {
        panic!("failed to load configuration: {err}");
    })
});
