use std::fmt::{Display, Formatter};
use std::str::FromStr;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SkillLevel {
    Unknown = 0,
    Emerging = 1,
    Working = 2,
    Fluent = 3,
}

impl SkillLevel {
    pub fn clamp(value: i32) -> Self {
        match value {
            0 => SkillLevel::Unknown,
            1 => SkillLevel::Emerging,
            2 => SkillLevel::Working,
            3 => SkillLevel::Fluent,
            v if v < 0 => SkillLevel::Unknown,
            _ => SkillLevel::Fluent,
        }
    }

    pub fn as_i32(self) -> i32 {
        self as i32
    }

    pub fn as_str(self) -> &'static str {
        match self {
            SkillLevel::Unknown => "unknown",
            SkillLevel::Emerging => "emerging",
            SkillLevel::Working => "working",
            SkillLevel::Fluent => "fluent",
        }
    }
}

impl Display for SkillLevel {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Error)]
#[error("unknown skill level: {0}")]
pub struct SkillLevelParseError(pub String);

impl FromStr for SkillLevel {
    type Err = SkillLevelParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "unknown" => Ok(SkillLevel::Unknown),
            "emerging" => Ok(SkillLevel::Emerging),
            "working" => Ok(SkillLevel::Working),
            "fluent" => Ok(SkillLevel::Fluent),
            other => Err(SkillLevelParseError(other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillPoint {
    pub id: Uuid,
    pub direction_id: Uuid,
    pub name: String,
    pub summary: Option<String>,
    pub level: SkillLevel,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SkillPoint {
    pub fn new(id: Uuid, direction_id: Uuid, draft: SkillPointDraft, now: DateTime<Utc>) -> Self {
        Self {
            id,
            direction_id,
            name: draft.name,
            summary: draft.summary,
            level: draft.level.unwrap_or(SkillLevel::Unknown),
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SkillPointDraft {
    pub name: String,
    pub summary: Option<String>,
    pub level: Option<SkillLevel>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SkillPointUpdate {
    pub name: Option<String>,
    pub summary: Option<Option<String>>,
    pub level: Option<SkillLevel>,
}
