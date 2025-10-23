use std::str::FromStr;

use chrono::NaiveTime;

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReminderTarget {
    Today,
    Review,
}

impl ReminderTarget {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReminderTarget::Today => "today",
            ReminderTarget::Review => "review",
        }
    }
}

impl FromStr for ReminderTarget {
    type Err = AppError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "today" => Ok(ReminderTarget::Today),
            "review" => Ok(ReminderTarget::Review),
            other => Err(AppError::Validation(format!(
                "unsupported reminder target: {}",
                other
            ))),
        }
    }
}

#[derive(Debug, Clone)]
pub struct NotificationPreferences {
    pub daily_reminder_enabled: bool,
    pub daily_reminder_time: NaiveTime,
    pub daily_reminder_target: ReminderTarget,
    pub due_reminder_enabled: bool,
    pub due_reminder_time: NaiveTime,
    pub due_reminder_target: ReminderTarget,
    pub remind_before_due_minutes: u32,
}

impl NotificationPreferences {
    pub fn apply_update(&self, update: NotificationPreferencesUpdate) -> Result<Self, AppError> {
        let mut next = self.clone();

        if let Some(enabled) = update.daily_reminder_enabled {
            next.daily_reminder_enabled = enabled;
        }
        if let Some(time) = update.daily_reminder_time {
            next.daily_reminder_time = time;
        }
        if let Some(target) = update.daily_reminder_target {
            next.daily_reminder_target = target;
        }
        if let Some(enabled) = update.due_reminder_enabled {
            next.due_reminder_enabled = enabled;
        }
        if let Some(time) = update.due_reminder_time {
            next.due_reminder_time = time;
        }
        if let Some(target) = update.due_reminder_target {
            next.due_reminder_target = target;
        }
        if let Some(minutes) = update.remind_before_due_minutes {
            next.remind_before_due_minutes = minutes;
        }

        Ok(next)
    }
}

#[derive(Debug, Default, Clone)]
pub struct NotificationPreferencesUpdate {
    pub daily_reminder_enabled: Option<bool>,
    pub daily_reminder_time: Option<NaiveTime>,
    pub daily_reminder_target: Option<ReminderTarget>,
    pub due_reminder_enabled: Option<bool>,
    pub due_reminder_time: Option<NaiveTime>,
    pub due_reminder_target: Option<ReminderTarget>,
    pub remind_before_due_minutes: Option<u32>,
}

pub fn parse_time(value: &str) -> Result<NaiveTime, AppError> {
    NaiveTime::parse_from_str(value, "%H:%M").map_err(|err| AppError::Validation(err.to_string()))
}
