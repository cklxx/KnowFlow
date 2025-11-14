use crate::clients::volcengine::VolcengineClient;
use crate::error::{AppError, Result};
use crate::models::digest::Article;
use serde::Deserialize;

#[derive(Clone)]
pub struct Summarizer {
    client: Option<VolcengineClient>,
}

#[derive(Debug, Clone)]
pub struct Summary {
    pub headline: String,
    pub happened: Vec<String>,
    pub impact: Vec<String>,
    pub actions: Vec<String>,
    pub one_minute: String,
}

impl Summarizer {
    pub fn new(client: Option<VolcengineClient>) -> Self {
        Self { client }
    }

    pub async fn summarise(&self, article: &Article) -> Result<Summary> {
        if let Some(client) = &self.client {
            let prompt = format!(
                r#"你是一名 AI 信息广播员，要为对技术不敏感的普通人写 3 段语音稿。请用中文非常口语化地总结下面的文章。

原始标题：{title}
原始摘要：{summary}
原始链接：{link}

请输出 JSON，字段如下：
- headline: 12 字以内的中文标题，亲切、无术语。
- happened: 一个数组，2-3 个 bullet，用来说明发生了什么。
- impact: 一个数组，2-3 个 bullet，从普通人视角讲影响。
- actions: 一个数组，1-2 个 bullet，告诉她要不要做什么（可以是“暂时不用做什么”）。
- one_minute: 60 秒总览稿，限制在 120 字以内。"#,
                title = article.title,
                summary = article.summary,
                link = article.link
            );

            let response = client.chat_completion(&prompt).await?;
            let parsed: SummarizerPayload = serde_json::from_str(&response).map_err(|err| {
                AppError::Upstream(format!(
                    "volcengine summary was not valid json: {err}; raw: {response}",
                    response = response
                ))
            })?;

            Ok(Summary {
                headline: parsed.headline,
                happened: parsed.happened,
                impact: parsed.impact,
                actions: parsed.actions,
                one_minute: parsed.one_minute,
            })
        } else {
            Ok(Self::fallback_summary(article))
        }
    }

    fn fallback_summary(article: &Article) -> Summary {
        let headline = truncate_headline(&article.title);
        let brief = clip_text(&article.summary, 120)
            .unwrap_or_else(|| "这条资讯暂时没有摘要，我们会在节目里聊聊它的重点。".to_string());
        let happened = vec![brief.clone()];
        let impact = vec!["我们会持续关注它是否影响日常生活，有变化会第一时间告诉你。".to_string()];
        let actions = vec!["暂时不用做任何事，知道这条消息就好。".to_string()];
        let summary_text = format!(
            "今天有一条和你相关的 AI 动态：{title}。简单来说：{brief}",
            title = article.title,
            brief = brief
        );

        Summary {
            headline,
            happened,
            impact,
            actions,
            one_minute: summary_text,
        }
    }
}

#[derive(Debug, Deserialize)]
struct SummarizerPayload {
    headline: String,
    happened: Vec<String>,
    impact: Vec<String>,
    actions: Vec<String>,
    #[serde(alias = "oneMinute")]
    one_minute: String,
}

fn truncate_headline(title: &str) -> String {
    let trimmed = title.trim();
    let mut result: String = trimmed.chars().take(12).collect();
    if trimmed.chars().count() > 12 {
        result.push('…');
    }
    if result.is_empty() {
        "今日有一条 AI 消息".to_string()
    } else {
        result
    }
}

fn clip_text(text: &str, limit: usize) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }

    let clipped: String = trimmed.chars().take(limit).collect();
    Some(clipped)
}
