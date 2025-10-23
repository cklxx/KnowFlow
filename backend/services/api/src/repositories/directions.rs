use std::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{query, Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{Direction, DirectionDraft, DirectionStage, DirectionUpdate};
use crate::error::{AppError, AppResult};
use crate::repositories::sync::{record_tombstone_tx, SyncEntity, TombstoneMetadata};

#[derive(Clone)]
pub struct DirectionRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> DirectionRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list(&self) -> AppResult<Vec<Direction>> {
        let rows = sqlx::query("SELECT id, name, stage, quarterly_goal, created_at, updated_at FROM directions ORDER BY created_at DESC")
            .fetch_all(self.pool)
            .await?;

        rows.into_iter().map(DirectionRow::try_from_row).collect()
    }

    pub async fn get(&self, id: Uuid) -> AppResult<Option<Direction>> {
        let row = sqlx::query("SELECT id, name, stage, quarterly_goal, created_at, updated_at FROM directions WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(self.pool)
            .await?;

        match row {
            Some(record) => Ok(Some(DirectionRow::try_from_row(record)?)),
            None => Ok(None),
        }
    }

    pub async fn create(&self, draft: DirectionDraft) -> AppResult<Direction> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let direction = Direction::new(id, draft, now);

        sqlx::query("INSERT INTO directions (id, name, stage, quarterly_goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(direction.id.to_string())
            .bind(&direction.name)
            .bind(direction.stage.to_string())
            .bind(&direction.quarterly_goal)
            .bind(direction.created_at.to_rfc3339())
            .bind(direction.updated_at.to_rfc3339())
            .execute(self.pool)
            .await?;

        Ok(direction)
    }

    pub async fn update(&self, id: Uuid, update: DirectionUpdate) -> AppResult<Option<Direction>> {
        let current = match self.get(id).await? {
            Some(direction) => direction,
            None => return Ok(None),
        };

        let mut name = current.name.clone();
        let mut stage = current.stage.clone();
        let mut quarterly_goal = current.quarterly_goal.clone();

        if let Some(value) = update.name {
            name = value;
        }
        if let Some(value) = update.stage {
            stage = value;
        }
        if let Some(value) = update.quarterly_goal {
            quarterly_goal = value;
        }

        let updated_at = Utc::now();

        sqlx::query("UPDATE directions SET name = ?, stage = ?, quarterly_goal = ?, updated_at = ? WHERE id = ?")
            .bind(&name)
            .bind(stage.to_string())
            .bind(&quarterly_goal)
            .bind(updated_at.to_rfc3339())
            .bind(id.to_string())
            .execute(self.pool)
            .await?;

        Ok(Some(Direction {
            id,
            name,
            stage,
            quarterly_goal,
            created_at: current.created_at,
            updated_at,
        }))
    }

    pub async fn delete(&self, id: Uuid) -> AppResult<bool> {
        let mut tx = self.pool.begin().await?;

        let skill_point_rows = query("SELECT id FROM skill_points WHERE direction_id = ?")
            .bind(id.to_string())
            .fetch_all(&mut *tx)
            .await?;

        let card_rows = query("SELECT id, skill_point_id FROM memory_cards WHERE direction_id = ?")
            .bind(id.to_string())
            .fetch_all(&mut *tx)
            .await?;

        let result = query("DELETE FROM directions WHERE id = ?")
            .bind(id.to_string())
            .execute(&mut *tx)
            .await?;

        if result.rows_affected() == 0 {
            tx.rollback().await?;
            return Ok(false);
        }

        let deleted_at = Utc::now();

        for row in skill_point_rows {
            let skill_id: String = row.get("id");
            let skill_id =
                Uuid::parse_str(&skill_id).map_err(|err| AppError::Validation(err.to_string()))?;
            record_tombstone_tx(
                tx.as_mut(),
                SyncEntity::SkillPoint,
                skill_id,
                TombstoneMetadata {
                    direction_id: Some(id),
                    ..Default::default()
                },
                deleted_at,
            )
            .await?;
        }

        for row in card_rows {
            let card_id: String = row.get("id");
            let card_id =
                Uuid::parse_str(&card_id).map_err(|err| AppError::Validation(err.to_string()))?;
            let skill_point_id: Option<String> = row.get("skill_point_id");
            let skill_point_id = match skill_point_id {
                Some(value) if !value.is_empty() => Some(
                    Uuid::parse_str(&value).map_err(|err| AppError::Validation(err.to_string()))?,
                ),
                _ => None,
            };

            record_tombstone_tx(
                tx.as_mut(),
                SyncEntity::MemoryCard,
                card_id,
                TombstoneMetadata {
                    direction_id: Some(id),
                    skill_point_id,
                },
                deleted_at,
            )
            .await?;
        }

        record_tombstone_tx(
            tx.as_mut(),
            SyncEntity::Direction,
            id,
            TombstoneMetadata {
                direction_id: Some(id),
                ..Default::default()
            },
            deleted_at,
        )
        .await?;

        tx.commit().await?;

        Ok(true)
    }

    pub async fn list_updated_between(
        &self,
        since: Option<DateTime<Utc>>,
        until: DateTime<Utc>,
    ) -> AppResult<Vec<Direction>> {
        let mut sql = String::from(
            "SELECT id, name, stage, quarterly_goal, created_at, updated_at FROM directions WHERE updated_at <= ?",
        );

        if since.is_some() {
            sql.push_str(" AND updated_at > ?");
        }

        sql.push_str(" ORDER BY created_at DESC");

        let mut query = sqlx::query(&sql).bind(until.to_rfc3339());

        if let Some(since) = since {
            query = query.bind(since.to_rfc3339());
        }

        let rows = query.fetch_all(self.pool).await?;

        rows.into_iter().map(DirectionRow::try_from_row).collect()
    }
}

struct DirectionRow {
    id: String,
    name: String,
    stage: String,
    quarterly_goal: Option<String>,
    created_at: String,
    updated_at: String,
}

impl DirectionRow {
    fn try_from_row(row: sqlx::sqlite::SqliteRow) -> AppResult<Direction> {
        let direction_row = DirectionRow {
            id: row.get("id"),
            name: row.get("name"),
            stage: row.get("stage"),
            quarterly_goal: row.get("quarterly_goal"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };

        direction_row.try_into_domain()
    }

    fn try_into_domain(self) -> AppResult<Direction> {
        let id = Uuid::parse_str(&self.id).map_err(|err| AppError::Validation(err.to_string()))?;
        let stage = DirectionStage::from_str(&self.stage)
            .map_err(|err| AppError::Validation(err.to_string()))?;
        let created_at = parse_time(&self.created_at)?;
        let updated_at = parse_time(&self.updated_at)?;

        Ok(Direction {
            id,
            name: self.name,
            stage,
            quarterly_goal: self.quarterly_goal,
            created_at,
            updated_at,
        })
    }
}

fn parse_time(value: &str) -> AppResult<DateTime<Utc>> {
    Ok(DateTime::parse_from_rfc3339(value)
        .map_err(|err| AppError::Validation(err.to_string()))?
        .with_timezone(&Utc))
}
