use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    pub id: Uuid,
    pub card_id: Uuid,
    pub source_type: String,
    pub source_uri: Option<String>,
    pub excerpt: Option<String>,
    pub credibility: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewEvidence {
    pub source_type: String,
    pub source_uri: Option<String>,
    pub excerpt: Option<String>,
    pub credibility: Option<i32>,
}
