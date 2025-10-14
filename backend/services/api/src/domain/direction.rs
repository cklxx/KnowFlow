use std::fmt::{Display, Formatter};
use std::str::FromStr;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DirectionStage {
    Explore,
    Shape,
    Attack,
    Stabilize,
}

impl Display for DirectionStage {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            DirectionStage::Explore => "explore",
            DirectionStage::Shape => "shape",
            DirectionStage::Attack => "attack",
            DirectionStage::Stabilize => "stabilize",
        })
    }
}

impl FromStr for DirectionStage {
    type Err = StageParseError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "explore" => Ok(DirectionStage::Explore),
            "shape" => Ok(DirectionStage::Shape),
            "attack" => Ok(DirectionStage::Attack),
            "stabilize" => Ok(DirectionStage::Stabilize),
            other => Err(StageParseError::UnknownStage(other.to_string())),
        }
    }
}

#[derive(Debug, Error)]
pub enum StageParseError {
    #[error("unknown direction stage: {0}")]
    UnknownStage(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Direction {
    pub id: Uuid,
    pub name: String,
    pub stage: DirectionStage,
    pub quarterly_goal: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Direction {
    pub fn new(id: Uuid, draft: DirectionDraft, now: DateTime<Utc>) -> Self {
        Self {
            id,
            name: draft.name,
            stage: draft.stage,
            quarterly_goal: draft.quarterly_goal,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct DirectionDraft {
    pub name: String,
    pub stage: DirectionStage,
    pub quarterly_goal: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DirectionUpdate {
    pub name: Option<String>,
    pub stage: Option<DirectionStage>,
    pub quarterly_goal: Option<Option<String>>,
}
