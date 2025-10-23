use chrono::{DateTime, Utc};
use sqlx::{query, Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{SkillLevel, SkillPoint, SkillPointDraft, SkillPointUpdate};
use crate::error::{AppError, AppResult};
use crate::repositories::sync::{record_tombstone_tx, SyncEntity, TombstoneMetadata};

#[derive(Clone)]
pub struct SkillPointRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SkillPointRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_by_direction(&self, direction_id: Uuid) -> AppResult<Vec<SkillPoint>> {
        let rows = sqlx::query("SELECT id, direction_id, name, summary, level, created_at, updated_at FROM skill_points WHERE direction_id = ? ORDER BY created_at ASC")
            .bind(direction_id.to_string())
            .fetch_all(self.pool)
            .await?;

        rows.into_iter()
            .map(SkillPointRow::try_from_row)
            .collect::<Result<Vec<_>, AppError>>()?
            .into_iter()
            .map(|row| row.into_domain())
            .collect()
    }

    pub async fn list_all(&self) -> AppResult<Vec<SkillPoint>> {
        let rows = sqlx::query(
            "SELECT id, direction_id, name, summary, level, created_at, updated_at FROM skill_points ORDER BY created_at ASC",
        )
        .fetch_all(self.pool)
        .await?;

        rows.into_iter()
            .map(SkillPointRow::try_from_row)
            .collect::<Result<Vec<_>, AppError>>()?
            .into_iter()
            .map(|row| row.into_domain())
            .collect()
    }

    pub async fn get(&self, id: Uuid) -> AppResult<Option<SkillPoint>> {
        let row = sqlx::query(
            "SELECT id, direction_id, name, summary, level, created_at, updated_at FROM skill_points WHERE id = ?",
        )
        .bind(id.to_string())
        .fetch_optional(self.pool)
        .await?;

        match row {
            Some(record) => Ok(Some(SkillPointRow::try_from_row(record)?.into_domain()?)),
            None => Ok(None),
        }
    }

    pub async fn create(
        &self,
        direction_id: Uuid,
        draft: SkillPointDraft,
    ) -> AppResult<SkillPoint> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let point = SkillPoint::new(id, direction_id, draft, now);

        sqlx::query("INSERT INTO skill_points (id, direction_id, name, summary, level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(point.id.to_string())
            .bind(point.direction_id.to_string())
            .bind(&point.name)
            .bind(&point.summary)
            .bind(point.level.as_i32())
            .bind(point.created_at.to_rfc3339())
            .bind(point.updated_at.to_rfc3339())
            .execute(self.pool)
            .await?;

        Ok(point)
    }

    pub async fn update(
        &self,
        id: Uuid,
        update: SkillPointUpdate,
    ) -> AppResult<Option<SkillPoint>> {
        let row = sqlx::query("SELECT id, direction_id, name, summary, level, created_at, updated_at FROM skill_points WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(self.pool)
            .await?;

        let Some(record) = row else {
            return Ok(None);
        };

        let mut point = SkillPointRow::try_from_row(record)?;

        if let Some(name) = update.name {
            point.name = name;
        }
        if let Some(summary) = update.summary {
            point.summary = summary;
        }
        if let Some(level) = update.level {
            point.level = level;
        }

        point.updated_at = Utc::now();

        sqlx::query(
            "UPDATE skill_points SET name = ?, summary = ?, level = ?, updated_at = ? WHERE id = ?",
        )
        .bind(&point.name)
        .bind(&point.summary)
        .bind(point.level.as_i32())
        .bind(point.updated_at.to_rfc3339())
        .bind(point.id.to_string())
        .execute(self.pool)
        .await?;

        Ok(Some(point.into_domain()?))
    }

    pub async fn delete(&self, id: Uuid) -> AppResult<bool> {
        let mut tx = self.pool.begin().await?;

        let row = query("SELECT id, direction_id FROM skill_points WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&mut *tx)
            .await?;

        let Some(record) = row else {
            tx.rollback().await?;
            return Ok(false);
        };

        let direction_id: String = record.get("direction_id");
        let direction_id =
            Uuid::parse_str(&direction_id).map_err(|err| AppError::Validation(err.to_string()))?;

        let now = Utc::now();

        query("UPDATE memory_cards SET skill_point_id = NULL, updated_at = ? WHERE skill_point_id = ?")
            .bind(now.to_rfc3339())
            .bind(id.to_string())
            .execute(&mut *tx)
            .await?;

        let result = query("DELETE FROM skill_points WHERE id = ?")
            .bind(id.to_string())
            .execute(&mut *tx)
            .await?;

        if result.rows_affected() == 0 {
            tx.rollback().await?;
            return Ok(false);
        }

        record_tombstone_tx(
            tx.as_mut(),
            SyncEntity::SkillPoint,
            id,
            TombstoneMetadata {
                direction_id: Some(direction_id),
                ..Default::default()
            },
            now,
        )
        .await?;

        tx.commit().await?;

        Ok(true)
    }

    pub async fn list_updated_between(
        &self,
        since: Option<DateTime<Utc>>,
        until: DateTime<Utc>,
    ) -> AppResult<Vec<SkillPoint>> {
        let mut sql = String::from(
            "SELECT id, direction_id, name, summary, level, created_at, updated_at FROM skill_points WHERE updated_at <= ?",
        );

        if since.is_some() {
            sql.push_str(" AND updated_at > ?");
        }

        sql.push_str(" ORDER BY created_at ASC");

        let mut query = sqlx::query(&sql).bind(until.to_rfc3339());

        if let Some(since) = since {
            query = query.bind(since.to_rfc3339());
        }

        let rows = query.fetch_all(self.pool).await?;

        rows.into_iter()
            .map(SkillPointRow::try_from_row)
            .collect::<Result<Vec<_>, AppError>>()?
            .into_iter()
            .map(|row| row.into_domain())
            .collect()
    }
}

struct SkillPointRow {
    id: Uuid,
    direction_id: Uuid,
    name: String,
    summary: Option<String>,
    level: SkillLevel,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl SkillPointRow {
    fn try_from_row(row: sqlx::sqlite::SqliteRow) -> AppResult<Self> {
        let id = parse_uuid(row.get("id"))?;
        let direction_id = parse_uuid(row.get("direction_id"))?;
        let created_at = parse_time(row.get("created_at"))?;
        let updated_at = parse_time(row.get("updated_at"))?;
        let level: i64 = row.get("level");

        Ok(Self {
            id,
            direction_id,
            name: row.get("name"),
            summary: row.get("summary"),
            level: SkillLevel::clamp(level as i32),
            created_at,
            updated_at,
        })
    }

    fn into_domain(self) -> AppResult<SkillPoint> {
        Ok(SkillPoint {
            id: self.id,
            direction_id: self.direction_id,
            name: self.name,
            summary: self.summary,
            level: self.level,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}

fn parse_uuid(value: String) -> AppResult<Uuid> {
    Uuid::parse_str(&value).map_err(|err| AppError::Validation(err.to_string()))
}

fn parse_time(value: String) -> AppResult<DateTime<Utc>> {
    Ok(DateTime::parse_from_rfc3339(&value)
        .map_err(|err| AppError::Validation(err.to_string()))?
        .with_timezone(&Utc))
}
