use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{SkillLevel, SkillPoint, SkillPointDraft, SkillPointUpdate};
use crate::error::{AppError, AppResult};

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
        let result = sqlx::query("DELETE FROM skill_points WHERE id = ?")
            .bind(id.to_string())
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
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
