use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::memory_card::MemoryCard;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutItemPlan {
    pub item_id: Uuid,
    pub card: MemoryCard,
    pub sequence: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSegmentPlan {
    pub phase: WorkoutPhase,
    pub items: Vec<WorkoutItemPlan>,
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
pub struct WorkoutCompletionSummary {
    pub workout_id: Uuid,
    pub completed_at: DateTime<Utc>,
    pub updates: Vec<WorkoutCardProgress>,
}
