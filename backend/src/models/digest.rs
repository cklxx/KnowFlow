use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub link: String,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestItem {
    pub title: String,
    pub headline: String,
    pub happened: Vec<String>,
    pub impact: Vec<String>,
    pub actions: Vec<String>,
    pub core_insights: Vec<String>,
    pub info_checks: Vec<String>,
    pub more_thoughts: Vec<String>,
    pub key_questions: Vec<DigestQuestion>,
    pub text_summary: String,
    pub audio_base64: Option<String>,
    pub audio_url: Option<String>,
    pub transcript_url: String,
    pub source_url: String,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestQuestion {
    pub question: String,
    pub answer: String,
    pub follow_up_question: Option<String>,
    pub follow_up_answer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyDigest {
    pub date: String,
    pub intro: String,
    pub items: Vec<DigestItem>,
    pub one_minute_brief: String,
}
