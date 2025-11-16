use crate::clients::volcengine::VolcengineClient;
use crate::error::Result;
use crate::models::digest::Article;
use serde::Deserialize;
use tracing::warn;

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
    pub core_insights: Vec<String>,
    pub info_checks: Vec<String>,
    pub more_thoughts: Vec<String>,
    pub key_questions: Vec<SummaryQuestion>,
    pub one_minute: String,
}

#[derive(Debug, Clone)]
pub struct SummaryQuestion {
    pub question: String,
    pub answer: String,
    pub follow_up_question: Option<String>,
    pub follow_up_answer: Option<String>,
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
- core_insights: 一个数组，2-3 个 bullet，提炼普通人真正需要记住的核心认知。
- info_checks: 一个数组，列出你在文章中看到的可核实事实、是否可信以及需要提醒的风险，保持 2-3 条。
- more_thoughts: 一个数组，提供延伸思考或下一步观察建议，保持 2-3 条。
- key_questions: 一个对象数组。每个对象包含 question（第一轮关键问题）、answer（基于文章给出的解答）、follow_up_question（顺着继续追问的第二轮问题，如果没有信息也要指出缺口）、follow_up_answer（给出已有信息或说明无法回答）。至少提供 2 个对象。
- one_minute: 60 秒总览稿，限制在 120 字以内。"#,
                title = article.title,
                summary = article.summary,
                link = article.link
            );

            let response = match client.chat_completion(&prompt).await {
                Ok(response) => response,
                Err(err) => {
                    warn!(
                        ?err,
                        "volcengine chat completion failed, falling back to offline summary"
                    );
                    return Ok(Self::fallback_summary(article));
                }
            };

            let parsed: SummarizerPayload = match serde_json::from_str(&response) {
                Ok(parsed) => parsed,
                Err(err) => {
                    warn!(
                        error = %err,
                        "volcengine summary was not valid json, falling back to offline summary"
                    );
                    return Ok(Self::fallback_summary(article));
                }
            };

            Ok(Summary {
                headline: parsed.headline,
                happened: parsed.happened,
                impact: parsed.impact,
                actions: parsed.actions,
                core_insights: parsed.core_insights,
                info_checks: parsed.info_checks,
                more_thoughts: parsed.more_thoughts,
                key_questions: parsed
                    .key_questions
                    .into_iter()
                    .map(|qa| SummaryQuestion {
                        question: qa.question,
                        answer: qa.answer,
                        follow_up_question: qa.follow_up_question,
                        follow_up_answer: qa.follow_up_answer,
                    })
                    .collect(),
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
        let core_insights = vec!["记住这条新闻揭示的关键变化，我们会帮你跟进后续。".to_string()];
        let info_checks =
            vec!["来源为可靠媒体，但细节尚待更多渠道确认，我们会继续核实。".to_string()];
        let more_thoughts =
            vec!["关注接下来是否有官方公告或专家分析，帮助判断影响范围。".to_string()];
        let key_questions = vec![
            SummaryQuestion {
                question: "这条消息最值得我关心的是什么？".to_string(),
                answer: "它提示了 AI 领域一个值得关注的新动态，我们会继续追踪影响。".to_string(),
                follow_up_question: Some("这条消息是否已经被多方证实？".to_string()),
                follow_up_answer: Some("公开渠道还在更新细节，我们会在确认后告诉你。".to_string()),
            },
            SummaryQuestion {
                question: "我接下来需要准备什么？".to_string(),
                answer: "暂时不用做决定，了解趋势并关注我们的后续播报即可。".to_string(),
                follow_up_question: Some("如果情况升级，我该找谁求证？".to_string()),
                follow_up_answer: Some(
                    "建议关注权威媒体或政府公告，我们也会持续更新。".to_string(),
                ),
            },
        ];
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
            core_insights,
            info_checks,
            more_thoughts,
            key_questions,
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
    core_insights: Vec<String>,
    info_checks: Vec<String>,
    more_thoughts: Vec<String>,
    key_questions: Vec<SummarizerQuestionPayload>,
    #[serde(alias = "oneMinute")]
    one_minute: String,
}

#[derive(Debug, Deserialize)]
struct SummarizerQuestionPayload {
    question: String,
    answer: String,
    #[serde(default)]
    follow_up_question: Option<String>,
    #[serde(default)]
    follow_up_answer: Option<String>,
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
