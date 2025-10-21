use std::collections::HashMap;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Sqlite};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::domain::{CardType, MemoryCard, MemoryCardDraft, MemoryCardUpdate, WorkoutResultKind};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct MemoryCardRepository<'a> {
    pool: &'a SqlitePool,
}

pub struct MemoryCardSearch<'a> {
    pub direction_id: Option<Uuid>,
    pub skill_point_id: Option<Uuid>,
    pub query: Option<&'a str>,
    pub due_before: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
}

impl<'a> Default for MemoryCardSearch<'a> {
    fn default() -> Self {
        Self {
            direction_id: None,
            skill_point_id: None,
            query: None,
            due_before: None,
            limit: None,
        }
    }
}

impl<'a> MemoryCardRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_by_direction(
        &self,
        direction_id: Uuid,
        skill_point_id: Option<Uuid>,
    ) -> AppResult<Vec<MemoryCard>> {
        let mut builder =
            QueryBuilder::<Sqlite>::new("SELECT * FROM memory_cards WHERE direction_id = ");
        builder.push_bind(direction_id.to_string());

        if let Some(skill_id) = skill_point_id {
            builder.push(" AND skill_point_id = ");
            builder.push_bind(skill_id.to_string());
        }

        builder.push(" ORDER BY created_at DESC");

        let rows = builder.build().fetch_all(self.pool).await?;

        rows.into_iter()
            .map(MemoryCardRow::try_from_row)
            .collect::<Result<Vec<_>, AppError>>()?
            .into_iter()
            .map(|row| row.into_domain())
            .collect()
    }

    pub async fn list_for_today(
        &self,
        now: DateTime<Utc>,
        limit: usize,
    ) -> AppResult<Vec<MemoryCard>> {
        let rows = sqlx::query(
            "SELECT * FROM memory_cards ORDER BY CASE WHEN next_due IS NULL OR next_due <= ? THEN 0 ELSE 1 END, next_due, priority DESC LIMIT ?",
        )
        .bind(now.to_rfc3339())
        .bind(limit as i64)
        .fetch_all(self.pool)
        .await?;

        rows.into_iter()
            .map(MemoryCardRow::try_from_row)
            .collect::<Result<Vec<_>, _>>()?
            .into_iter()
            .map(|row| row.into_domain())
            .collect()
    }

    pub async fn review_stats(&self) -> AppResult<HashMap<Uuid, CardReviewStats>> {
        const RECENT_RESULTS_LIMIT: usize = 8;

        let rows = sqlx::query(
            "SELECT wi.card_id AS card_id, \
                    MAX(COALESCE(w.completed_at, wi.created_at)) AS last_seen, \
                    SUM(CASE WHEN wi.result = 'pass' THEN 1 ELSE 0 END) AS pass_count, \
                    SUM(CASE WHEN wi.result = 'fail' THEN 1 ELSE 0 END) AS fail_count, \
                    MAX(CASE WHEN wi.result = 'pass' THEN COALESCE(w.completed_at, wi.created_at) END) AS last_pass_at, \
                    MAX(CASE WHEN wi.result = 'fail' THEN COALESCE(w.completed_at, wi.created_at) END) AS last_fail_at \
             FROM workout_items wi \
             JOIN workouts w ON wi.workout_id = w.id \
             WHERE wi.result IS NOT NULL AND w.status = 'completed' \
             GROUP BY wi.card_id",
        )
        .fetch_all(self.pool)
        .await?;

        let mut map = HashMap::with_capacity(rows.len());

        for row in rows {
            let card_id = parse_uuid(row.get::<String, _>("card_id"))?;
            let last_seen: Option<String> = row.get("last_seen");
            let pass_count: Option<i64> = row.get("pass_count");
            let fail_count: Option<i64> = row.get("fail_count");
            let last_pass_at: Option<String> = row.get("last_pass_at");
            let last_fail_at: Option<String> = row.get("last_fail_at");

            let stats = CardReviewStats {
                last_seen: last_seen.map(parse_time).transpose()?,
                last_pass_at: last_pass_at.map(parse_time).transpose()?,
                last_fail_at: last_fail_at.map(parse_time).transpose()?,
                pass_count: pass_count.unwrap_or(0),
                fail_count: fail_count.unwrap_or(0),
                ..Default::default()
            };

            map.insert(card_id, stats);
        }

        let recent_rows = sqlx::query(
            "SELECT card_id, result, occurred_at, rn FROM ( \
                 SELECT wi.card_id AS card_id, \
                        wi.result AS result, \
                        COALESCE(w.completed_at, wi.created_at) AS occurred_at, \
                        ROW_NUMBER() OVER (PARTITION BY wi.card_id ORDER BY COALESCE(w.completed_at, wi.created_at) DESC) AS rn \
                 FROM workout_items wi \
                 JOIN workouts w ON wi.workout_id = w.id \
                 WHERE wi.result IS NOT NULL AND w.status = 'completed' \
             ) \
             WHERE rn <= ? \
             ORDER BY card_id, rn",
        )
        .bind(RECENT_RESULTS_LIMIT as i64)
        .fetch_all(self.pool)
        .await?;

        let mut last_card: Option<Uuid> = None;
        let mut streak_kind: Option<WorkoutResultKind> = None;

        for row in recent_rows {
            let card_id = parse_uuid(row.get::<String, _>("card_id"))?;
            let raw_result: String = row.get("result");
            let result = WorkoutResultKind::from_str(&raw_result)
                .map_err(|err| AppError::Validation(err.to_string()))?;

            let stats = map.entry(card_id).or_default();

            if stats.recent_results.len() < RECENT_RESULTS_LIMIT {
                stats.recent_results.push(result);
            }

            if last_card != Some(card_id) {
                last_card = Some(card_id);
                streak_kind = None;
                stats.consecutive_passes = 0;
                stats.consecutive_fails = 0;
            }

            match streak_kind {
                None => {
                    streak_kind = Some(result);
                    match result {
                        WorkoutResultKind::Pass => stats.consecutive_passes = 1,
                        WorkoutResultKind::Fail => stats.consecutive_fails = 1,
                    }
                }
                Some(kind) if kind == result => match result {
                    WorkoutResultKind::Pass => stats.consecutive_passes += 1,
                    WorkoutResultKind::Fail => stats.consecutive_fails += 1,
                },
                Some(_) => {}
            }
        }

        Ok(map)
    }

    pub async fn search(&self, params: MemoryCardSearch<'_>) -> AppResult<Vec<MemoryCard>> {
        let mut builder = QueryBuilder::<Sqlite>::new("SELECT * FROM memory_cards");
        let mut separator = " WHERE ";

        if let Some(id) = params.direction_id {
            builder
                .push(separator)
                .push("direction_id = ")
                .push_bind(id.to_string());
            separator = " AND ";
        }

        if let Some(id) = params.skill_point_id {
            builder
                .push(separator)
                .push("skill_point_id = ")
                .push_bind(id.to_string());
            separator = " AND ";
        }

        if let Some(due_before) = params.due_before {
            builder
                .push(separator)
                .push("(next_due IS NULL OR next_due <= ")
                .push_bind(due_before.to_rfc3339())
                .push(")");
            separator = " AND ";
        }

        if let Some(query) = params.query {
            let pattern = format!("%{}%", query.to_lowercase());
            builder
                .push(separator)
                .push("(lower(title) LIKE ")
                .push_bind(pattern.clone())
                .push(" OR lower(body) LIKE ")
                .push_bind(pattern)
                .push(")");
        }

        builder.push(" ORDER BY priority DESC, created_at DESC");

        if let Some(limit) = params.limit {
            builder.push(" LIMIT ").push_bind(limit as i64);
        }

        let rows = builder.build().fetch_all(self.pool).await?;

        rows.into_iter()
            .map(MemoryCardRow::try_from_row)
            .collect::<Result<Vec<_>, _>>()?
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

#[derive(Debug, Clone)]
pub struct CardReviewStats {
    pub last_seen: Option<DateTime<Utc>>,
    pub last_pass_at: Option<DateTime<Utc>>,
    pub last_fail_at: Option<DateTime<Utc>>,
    pub pass_count: i64,
    pub fail_count: i64,
    pub consecutive_passes: u32,
    pub consecutive_fails: u32,
    pub recent_results: Vec<WorkoutResultKind>,
}

impl Default for CardReviewStats {
    fn default() -> Self {
        Self {
            last_seen: None,
            last_pass_at: None,
            last_fail_at: None,
            pass_count: 0,
            fail_count: 0,
            consecutive_passes: 0,
            consecutive_fails: 0,
            recent_results: Vec::new(),
        }
    }
}

impl CardReviewStats {
    pub fn total_reviews(&self) -> i64 {
        self.pass_count + self.fail_count
    }

    pub fn fail_rate(&self) -> f64 {
        let total = self.total_reviews();
        if total == 0 {
            0.0
        } else {
            (self.fail_count as f64 / total as f64).clamp(0.0, 1.0)
        }
    }
}

pub(crate) struct MemoryCardRow {
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
    pub(crate) fn try_from_row(row: sqlx::sqlite::SqliteRow) -> AppResult<Self> {
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

    pub(crate) fn into_domain(self) -> AppResult<MemoryCard> {
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
