use std::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{CardType, MemoryCard, MemoryCardDraft, MemoryCardUpdate};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct MemoryCardRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> MemoryCardRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_by_direction(&self, direction_id: Uuid) -> AppResult<Vec<MemoryCard>> {
        let rows = sqlx::query(
            "SELECT * FROM memory_cards WHERE direction_id = ? ORDER BY created_at DESC",
        )
        .bind(direction_id.to_string())
        .fetch_all(self.pool)
        .await?;

        rows.into_iter()
            .map(MemoryCardRow::try_from_row)
            .collect::<Result<Vec<_>, AppError>>()?
            .into_iter()
            .map(|row| row.into_domain())
            .collect()
    }

    pub async fn get(&self, id: Uuid) -> AppResult<Option<MemoryCard>> {
        let row = sqlx::query("SELECT * FROM memory_cards WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(self.pool)
            .await?;

        match row {
            Some(record) => Ok(Some(MemoryCardRow::try_from_row(record)?.into_domain()?)),
            None => Ok(None),
        }
    }

    pub async fn create(
        &self,
        direction_id: Uuid,
        draft: MemoryCardDraft,
    ) -> AppResult<MemoryCard> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let card = MemoryCard::new(id, direction_id, draft, now);

        sqlx::query("INSERT INTO memory_cards (id, direction_id, skill_point_id, title, body, card_type, stability, relevance, novelty, priority, next_due, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(card.id.to_string())
            .bind(card.direction_id.to_string())
            .bind(card.skill_point_id.map(|v| v.to_string()))
            .bind(&card.title)
            .bind(&card.body)
            .bind(card.card_type.as_str())
            .bind(card.stability)
            .bind(card.relevance)
            .bind(card.novelty)
            .bind(card.priority)
            .bind(card.next_due.map(|dt| dt.to_rfc3339()))
            .bind(card.created_at.to_rfc3339())
            .bind(card.updated_at.to_rfc3339())
            .execute(self.pool)
            .await?;

        Ok(card)
    }

    pub async fn update(
        &self,
        id: Uuid,
        update: MemoryCardUpdate,
    ) -> AppResult<Option<MemoryCard>> {
        let row = sqlx::query("SELECT * FROM memory_cards WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(self.pool)
            .await?;

        let Some(mut record) = row.map(MemoryCardRow::try_from_row).transpose()? else {
            return Ok(None);
        };

        if let Some(skill_point_id) = update.skill_point_id {
            record.skill_point_id = skill_point_id;
        }
        if let Some(title) = update.title {
            record.title = title;
        }
        if let Some(body) = update.body {
            record.body = body;
        }
        if let Some(card_type) = update.card_type {
            record.card_type = card_type;
        }
        if let Some(stability) = update.stability {
            record.stability = stability;
        }
        if let Some(relevance) = update.relevance {
            record.relevance = relevance;
        }
        if let Some(novelty) = update.novelty {
            record.novelty = novelty;
        }
        if let Some(priority) = update.priority {
            record.priority = priority;
        }
        if let Some(next_due) = update.next_due {
            record.next_due = next_due;
        }

        record.updated_at = Utc::now();

        sqlx::query("UPDATE memory_cards SET skill_point_id = ?, title = ?, body = ?, card_type = ?, stability = ?, relevance = ?, novelty = ?, priority = ?, next_due = ?, updated_at = ? WHERE id = ?")
            .bind(record.skill_point_id.map(|v| v.to_string()))
            .bind(&record.title)
            .bind(&record.body)
            .bind(record.card_type.as_str())
            .bind(record.stability)
            .bind(record.relevance)
            .bind(record.novelty)
            .bind(record.priority)
            .bind(record.next_due.map(|dt| dt.to_rfc3339()))
            .bind(record.updated_at.to_rfc3339())
            .bind(record.id.to_string())
            .execute(self.pool)
            .await?;

        Ok(Some(record.into_domain()?))
    }

    pub async fn delete(&self, id: Uuid) -> AppResult<bool> {
        let result = sqlx::query("DELETE FROM memory_cards WHERE id = ?")
            .bind(id.to_string())
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

struct MemoryCardRow {
    id: Uuid,
    direction_id: Uuid,
    skill_point_id: Option<Uuid>,
    title: String,
    body: String,
    card_type: CardType,
    stability: f64,
    relevance: f64,
    novelty: f64,
    priority: f64,
    next_due: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl MemoryCardRow {
    fn try_from_row(row: sqlx::sqlite::SqliteRow) -> AppResult<Self> {
        let id = parse_uuid(row.get("id"))?;
        let direction_id = parse_uuid(row.get("direction_id"))?;
        let skill_point_id: Option<String> = row.get("skill_point_id");
        let card_type: String = row.get("card_type");
        let created_at = parse_time(row.get("created_at"))?;
        let updated_at = parse_time(row.get("updated_at"))?;
        let next_due: Option<String> = row.get("next_due");

        Ok(Self {
            id,
            direction_id,
            skill_point_id: skill_point_id.map(parse_uuid).transpose()?,
            title: row.get("title"),
            body: row.get("body"),
            card_type: CardType::from_str(&card_type)
                .map_err(|err| AppError::Validation(err.to_string()))?,
            stability: row.get("stability"),
            relevance: row.get("relevance"),
            novelty: row.get("novelty"),
            priority: row.get("priority"),
            next_due: next_due.map(parse_time).transpose()?,
            created_at,
            updated_at,
        })
    }

    fn into_domain(self) -> AppResult<MemoryCard> {
        Ok(MemoryCard {
            id: self.id,
            direction_id: self.direction_id,
            skill_point_id: self.skill_point_id,
            title: self.title,
            body: self.body,
            card_type: self.card_type,
            stability: self.stability,
            relevance: self.relevance,
            novelty: self.novelty,
            priority: self.priority,
            next_due: self.next_due,
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
