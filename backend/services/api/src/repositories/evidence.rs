use chrono::Utc;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{Evidence, NewEvidence};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct EvidenceRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> EvidenceRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_for_card(&self, card_id: Uuid) -> AppResult<Vec<Evidence>> {
        let rows = sqlx::query(
            "SELECT id, card_id, source_type, source_uri, excerpt, credibility, created_at FROM evidence WHERE card_id = ? ORDER BY created_at DESC",
        )
        .bind(card_id.to_string())
        .fetch_all(self.pool)
        .await?;

        rows.into_iter().map(map_row_to_evidence).collect()
    }

    pub async fn create(&self, card_id: Uuid, input: NewEvidence) -> AppResult<Evidence> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let credibility = input.credibility.unwrap_or(0);

        sqlx::query(
            "INSERT INTO evidence (id, card_id, source_type, source_uri, excerpt, credibility, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(id.to_string())
        .bind(card_id.to_string())
        .bind(&input.source_type)
        .bind(input.source_uri.as_deref())
        .bind(input.excerpt.as_deref())
        .bind(credibility)
        .bind(now.to_rfc3339())
        .execute(self.pool)
        .await?;

        Ok(Evidence {
            id,
            card_id,
            source_type: input.source_type,
            source_uri: input.source_uri,
            excerpt: input.excerpt,
            credibility,
            created_at: now,
        })
    }

    pub async fn delete(&self, id: Uuid) -> AppResult<bool> {
        let result = sqlx::query("DELETE FROM evidence WHERE id = ?")
            .bind(id.to_string())
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

fn map_row_to_evidence(row: sqlx::sqlite::SqliteRow) -> AppResult<Evidence> {
    let id: String = row.try_get("id")?;
    let card_id: String = row.try_get("card_id")?;
    let created_at: String = row.try_get("created_at")?;

    Ok(Evidence {
        id: Uuid::parse_str(&id).map_err(|err| AppError::Validation(err.to_string()))?,
        card_id: Uuid::parse_str(&card_id).map_err(|err| AppError::Validation(err.to_string()))?,
        source_type: row.try_get("source_type")?,
        source_uri: row.try_get("source_uri")?,
        excerpt: row.try_get("excerpt")?,
        credibility: row.try_get("credibility")?,
        created_at: chrono::DateTime::parse_from_rfc3339(&created_at)
            .map_err(|err| AppError::Validation(err.to_string()))?
            .with_timezone(&Utc),
    })
}
