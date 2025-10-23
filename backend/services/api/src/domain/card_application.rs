use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CardApplication {
    pub id: Uuid,
    pub card_id: Uuid,
    pub context: String,
    pub noted_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewCardApplication {
    pub context: String,
    pub noted_at: DateTime<Utc>,
}
