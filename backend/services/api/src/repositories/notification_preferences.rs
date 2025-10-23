use std::str::FromStr;

use chrono::Utc;
use sqlx::{Row, SqlitePool};

use crate::domain::{
    parse_notification_time, NotificationPreferences, NotificationPreferencesUpdate, ReminderTarget,
};
use crate::error::AppResult;

pub struct NotificationPreferencesRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> NotificationPreferencesRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get(&self) -> AppResult<NotificationPreferences> {
        let row = sqlx::query(
            r#"
SELECT
    daily_reminder_enabled,
    daily_reminder_time,
    daily_reminder_target,
    due_reminder_enabled,
    due_reminder_time,
    due_reminder_target,
    remind_before_due_minutes
FROM notification_preferences
WHERE id = 1
            "#,
        )
        .fetch_one(self.pool)
        .await?;

        Ok(NotificationPreferences {
            daily_reminder_enabled: row.get::<i64, _>("daily_reminder_enabled") == 1,
            daily_reminder_time: parse_notification_time(
                row.get::<String, _>("daily_reminder_time").as_str(),
            )?,
            daily_reminder_target: ReminderTarget::from_str(
                &row.get::<String, _>("daily_reminder_target"),
            )?,
            due_reminder_enabled: row.get::<i64, _>("due_reminder_enabled") == 1,
            due_reminder_time: parse_notification_time(
                row.get::<String, _>("due_reminder_time").as_str(),
            )?,
            due_reminder_target: ReminderTarget::from_str(
                &row.get::<String, _>("due_reminder_target"),
            )?,
            remind_before_due_minutes: row.get::<i64, _>("remind_before_due_minutes") as u32,
        })
    }

    pub async fn update(
        &self,
        update: NotificationPreferencesUpdate,
    ) -> AppResult<NotificationPreferences> {
        let current = self.get().await?;
        let next = current.apply_update(update)?;
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
UPDATE notification_preferences
SET
    daily_reminder_enabled = ?,
    daily_reminder_time = ?,
    daily_reminder_target = ?,
    due_reminder_enabled = ?,
    due_reminder_time = ?,
    due_reminder_target = ?,
    remind_before_due_minutes = ?,
    updated_at = ?
WHERE id = 1
            "#,
        )
        .bind(if next.daily_reminder_enabled { 1 } else { 0 })
        .bind(next.daily_reminder_time.format("%H:%M").to_string())
        .bind(next.daily_reminder_target.as_str())
        .bind(if next.due_reminder_enabled { 1 } else { 0 })
        .bind(next.due_reminder_time.format("%H:%M").to_string())
        .bind(next.due_reminder_target.as_str())
        .bind(next.remind_before_due_minutes as i64)
        .bind(now)
        .execute(self.pool)
        .await?;

        Ok(next)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveTime;
    use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
    use std::str::FromStr;

    async fn setup_pool() -> SqlitePool {
        let options = SqliteConnectOptions::from_str("sqlite::memory:")
            .expect("in-memory sqlite")
            .create_if_missing(true)
            .foreign_keys(true);

        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .expect("pool");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("migrations");

        pool
    }

    #[tokio::test]
    async fn get_returns_seed_defaults() {
        let pool = setup_pool().await;
        let repo = NotificationPreferencesRepository::new(&pool);

        let prefs = repo.get().await.expect("preferences fetched");

        assert!(prefs.daily_reminder_enabled);
        assert_eq!(
            prefs.daily_reminder_time,
            NaiveTime::from_hms_opt(21, 0, 0).unwrap()
        );
        assert_eq!(prefs.daily_reminder_target, ReminderTarget::Today);
        assert!(prefs.due_reminder_enabled);
        assert_eq!(
            prefs.due_reminder_time,
            NaiveTime::from_hms_opt(20, 30, 0).unwrap()
        );
        assert_eq!(prefs.due_reminder_target, ReminderTarget::Review);
        assert_eq!(prefs.remind_before_due_minutes, 45);
    }

    #[tokio::test]
    async fn update_persists_partial_changes() {
        let pool = setup_pool().await;
        let repo = NotificationPreferencesRepository::new(&pool);

        let updated = repo
            .update(NotificationPreferencesUpdate {
                daily_reminder_enabled: Some(false),
                remind_before_due_minutes: Some(15),
                due_reminder_time: Some(NaiveTime::from_hms_opt(9, 45, 0).unwrap()),
                due_reminder_target: Some(ReminderTarget::Today),
                ..Default::default()
            })
            .await
            .expect("preferences updated");

        assert!(!updated.daily_reminder_enabled);
        assert_eq!(updated.remind_before_due_minutes, 15);
        assert_eq!(updated.due_reminder_target, ReminderTarget::Today);
        assert_eq!(
            updated.due_reminder_time,
            NaiveTime::from_hms_opt(9, 45, 0).unwrap()
        );

        let persisted = repo.get().await.expect("preferences fetched");
        assert_eq!(
            persisted.daily_reminder_enabled,
            updated.daily_reminder_enabled
        );
        assert_eq!(persisted.remind_before_due_minutes, 15);
        assert_eq!(persisted.due_reminder_target, ReminderTarget::Today);
        assert_eq!(
            persisted.due_reminder_time,
            NaiveTime::from_hms_opt(9, 45, 0).unwrap()
        );
        assert_eq!(persisted.daily_reminder_time, updated.daily_reminder_time);
    }
}
