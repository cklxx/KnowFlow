use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

use crate::domain::direction::DirectionStage;
use crate::domain::memory_card::MemoryCard;
use crate::domain::skill_point::SkillLevel;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutPhase {
    Quiz,
    Apply,
    Review,
}

impl WorkoutPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            WorkoutPhase::Quiz => "quiz",
            WorkoutPhase::Apply => "apply",
            WorkoutPhase::Review => "review",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutStatus {
    Pending,
    Completed,
}

impl WorkoutStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            WorkoutStatus::Pending => "pending",
            WorkoutStatus::Completed => "completed",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutResultKind {
    Pass,
    Fail,
}

impl WorkoutResultKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            WorkoutResultKind::Pass => "pass",
            WorkoutResultKind::Fail => "fail",
        }
    }
}

impl FromStr for WorkoutResultKind {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pass" => Ok(WorkoutResultKind::Pass),
            "fail" => Ok(WorkoutResultKind::Fail),
            _ => Err("unknown workout result kind"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutItemPlan {
    pub item_id: Uuid,
    pub card: MemoryCard,
    pub sequence: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSegmentPlan {
    pub phase: WorkoutPhase,
    pub focus: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub focus_details: Option<WorkoutSegmentFocus>,
    pub items: Vec<WorkoutItemPlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSegmentFocus {
    pub headline: String,
    #[serde(default)]
    pub highlights: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub direction_breakdown: Vec<WorkoutSegmentDirectionFocus>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub skill_breakdown: Vec<WorkoutSegmentSkillFocus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSegmentDirectionFocus {
    pub direction_id: Uuid,
    pub name: String,
    pub stage: DirectionStage,
    pub count: usize,
    pub share: f64,
    #[serde(default)]
    pub signals: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSegmentSkillFocus {
    pub skill_point_id: Uuid,
    pub name: String,
    pub level: SkillLevel,
    pub count: usize,
    pub share: f64,
    #[serde(default)]
    pub signals: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WorkoutTotals {
    pub total_cards: usize,
    pub quiz: usize,
    pub apply: usize,
    pub review: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodayWorkoutPlan {
    pub workout_id: Uuid,
    pub scheduled_for: DateTime<Utc>,
    pub generated_at: DateTime<Utc>,
    pub segments: Vec<WorkoutSegmentPlan>,
    pub totals: WorkoutTotals,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutCardProgress {
    pub card_id: Uuid,
    pub result: WorkoutResultKind,
    pub stability: f64,
    pub priority: f64,
    pub next_due: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSummaryMetrics {
    pub total_items: usize,
    pub pass_count: usize,
    pub fail_count: usize,
    pub pass_rate: f64,
    pub kv_delta: f64,
    pub udr: f64,
    pub recommended_focus: Option<String>,
    pub direction_breakdown: Vec<WorkoutSummaryDirectionBreakdown>,
    pub skill_breakdown: Vec<WorkoutSummarySkillBreakdown>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutCompletionSummary {
    pub workout_id: Uuid,
    pub completed_at: DateTime<Utc>,
    pub updates: Vec<WorkoutCardProgress>,
    pub metrics: WorkoutSummaryMetrics,
    pub insights: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSummaryDirectionBreakdown {
    pub direction_id: Uuid,
    pub name: String,
    pub stage: DirectionStage,
    pub total: usize,
    pub pass_count: usize,
    pub fail_count: usize,
    pub pass_rate: f64,
    pub kv_delta: f64,
    pub udr: f64,
    pub avg_priority: f64,
    pub share: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSummarySkillBreakdown {
    pub skill_point_id: Uuid,
    pub name: String,
    pub level: SkillLevel,
    pub total: usize,
    pub pass_count: usize,
    pub fail_count: usize,
    pub pass_rate: f64,
    pub kv_delta: f64,
    pub udr: f64,
    pub avg_priority: f64,
    pub share: f64,
}
