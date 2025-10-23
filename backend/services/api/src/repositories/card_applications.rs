use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{CardApplication, NewCardApplication};
use crate::error::AppResult;

pub struct CardApplicationRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> CardApplicationRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_for_card(&self, card_id: Uuid) -> AppResult<Vec<CardApplication>> {
        let rows = sqlx::query(
            r#"
SELECT id, card_id, context, noted_at
FROM card_applications
WHERE card_id = ?
ORDER BY noted_at DESC
            "#,
        )
        .bind(card_id.to_string())
        .fetch_all(self.pool)
        .await?;

        let applications = rows
            .into_iter()
            .map(|row| CardApplication {
                id: Uuid::parse_str(&row.get::<String, _>("id")).expect("valid uuid"),
                card_id: Uuid::parse_str(&row.get::<String, _>("card_id")).expect("valid uuid"),
                context: row.get("context"),
                noted_at: parse_time(row.get("noted_at")),
            })
            .collect();

        Ok(applications)
    }

    pub async fn create(
        &self,
        card_id: Uuid,
        input: NewCardApplication,
    ) -> AppResult<CardApplication> {
        let id = Uuid::new_v4();

        sqlx::query(
            "INSERT INTO card_applications (id, card_id, context, noted_at) VALUES (?, ?, ?, ?)",
        )
        .bind(id.to_string())
        .bind(card_id.to_string())
        .bind(&input.context)
        .bind(input.noted_at.to_rfc3339())
        .execute(self.pool)
        .await?;

        Ok(CardApplication {
            id,
            card_id,
            context: input.context,
            noted_at: input.noted_at,
        })
    }
}

fn parse_time(value: String) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(&value)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};
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

    async fn seed_card(pool: &SqlitePool) -> Uuid {
        let direction_id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT INTO directions (id, name, stage, quarterly_goal, created_at, updated_at) \
             VALUES (?, ?, ?, NULL, ?, ?)",
        )
        .bind(direction_id.to_string())
        .bind("Learning")
        .bind("explore")
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await
        .expect("direction inserted");

        let card_id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO memory_cards (
                id,
                direction_id,
                skill_point_id,
                title,
                body,
                card_type,
                stability,
                relevance,
                novelty,
                priority,
                next_due,
                created_at,
                updated_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        )
        .bind(card_id.to_string())
        .bind(direction_id.to_string())
        .bind("Card title")
        .bind("Card body")
        .bind("concept")
        .bind(0.5_f64)
        .bind(0.7_f64)
        .bind(0.3_f64)
        .bind(0.6_f64)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await
        .expect("card inserted");

        card_id
    }

    #[tokio::test]
    async fn create_and_list_orders_descending() {
        let pool = setup_pool().await;
        let card_id = seed_card(&pool).await;
        let repo = CardApplicationRepository::new(&pool);

        let noted_earlier = Utc::now() - Duration::hours(2);
        repo.create(
            card_id,
            NewCardApplication {
                context: "First usage".to_string(),
                noted_at: noted_earlier,
            },
        )
        .await
        .expect("first application created");

        let noted_later = Utc::now();
        let second = repo
            .create(
                card_id,
                NewCardApplication {
                    context: "Second usage".to_string(),
                    noted_at: noted_later,
                },
            )
            .await
            .expect("second application created");

        let applications = repo
            .list_for_card(card_id)
            .await
            .expect("applications fetched");

        assert_eq!(applications.len(), 2);
        assert_eq!(applications[0].context, "Second usage");
        assert_eq!(applications[0].id, second.id);
        assert_eq!(applications[0].noted_at, noted_later);
        assert_eq!(applications[1].context, "First usage");
        assert_eq!(applications[1].noted_at, noted_earlier);
    }
}
