use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CardType {
    Fact,
    Concept,
    Procedure,
    Claim,
}

impl CardType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CardType::Fact => "fact",
            CardType::Concept => "concept",
            CardType::Procedure => "procedure",
            CardType::Claim => "claim",
        }
    }
}

impl std::fmt::Display for CardType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for CardType {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "fact" => Ok(CardType::Fact),
            "concept" => Ok(CardType::Concept),
            "procedure" => Ok(CardType::Procedure),
            "claim" => Ok(CardType::Claim),
            _ => Err("unknown card type"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryCard {
    pub id: Uuid,
    pub direction_id: Uuid,
    pub skill_point_id: Option<Uuid>,
    pub title: String,
    pub body: String,
    pub card_type: CardType,
    pub stability: f64,
    pub relevance: f64,
    pub novelty: f64,
    pub priority: f64,
    pub next_due: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl MemoryCard {
    pub fn new(id: Uuid, direction_id: Uuid, draft: MemoryCardDraft, now: DateTime<Utc>) -> Self {
        let stability = draft.stability.unwrap_or(0.1);
        let relevance = draft.relevance.unwrap_or(0.7);
        let novelty = draft.novelty.unwrap_or(0.5);
        let priority = draft
            .priority
            .unwrap_or_else(|| calculate_priority(stability, relevance, novelty));

        Self {
            id,
            direction_id,
            skill_point_id: draft.skill_point_id,
            title: draft.title,
            body: draft.body,
            card_type: draft.card_type,
            stability,
            relevance,
            novelty,
            priority,
            next_due: draft.next_due,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct MemoryCardDraft {
    pub skill_point_id: Option<Uuid>,
    pub title: String,
    pub body: String,
    pub card_type: CardType,
    pub stability: Option<f64>,
    pub relevance: Option<f64>,
    pub novelty: Option<f64>,
    pub priority: Option<f64>,
    pub next_due: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MemoryCardUpdate {
    pub skill_point_id: Option<Option<Uuid>>,
    pub title: Option<String>,
    pub body: Option<String>,
    pub card_type: Option<CardType>,
    pub stability: Option<f64>,
    pub relevance: Option<f64>,
    pub novelty: Option<f64>,
    pub priority: Option<f64>,
    pub next_due: Option<Option<DateTime<Utc>>>,
}

pub fn calculate_priority(stability: f64, relevance: f64, novelty: f64) -> f64 {
    let stability_component = (1.0 - stability).clamp(0.0, 1.0);
    let relevance_component = relevance.clamp(0.0, 1.0);
    let novelty_component = novelty.clamp(0.0, 1.0);

    0.4 * stability_component + 0.4 * relevance_component + 0.2 * novelty_component
}
