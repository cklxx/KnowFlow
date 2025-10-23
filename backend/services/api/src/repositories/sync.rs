use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{query, QueryBuilder, Row, Sqlite, SqliteConnection, SqlitePool};
use uuid::Uuid;

use crate::domain::{Direction, MemoryCard, SkillPoint};
use crate::error::{AppError, AppResult};
use crate::repositories::directions::DirectionRepository;
use crate::repositories::memory_cards::MemoryCardRepository;
use crate::repositories::skill_points::SkillPointRepository;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncEntity {
    Direction,
    SkillPoint,
    MemoryCard,
}

impl SyncEntity {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncEntity::Direction => "direction",
            SyncEntity::SkillPoint => "skill_point",
            SyncEntity::MemoryCard => "memory_card",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "direction" => Some(SyncEntity::Direction),
            "skill_point" => Some(SyncEntity::SkillPoint),
            "memory_card" => Some(SyncEntity::MemoryCard),
            _ => None,
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct TombstoneMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skill_point_id: Option<Uuid>,
}

#[derive(Debug)]
pub struct TombstoneRecord {
    pub entity: SyncEntity,
    pub entity_id: Uuid,
    pub metadata: TombstoneMetadata,
    pub deleted_at: DateTime<Utc>,
}

pub async fn record_tombstone_tx(
    conn: &mut SqliteConnection,
    entity: SyncEntity,
    entity_id: Uuid,
    metadata: TombstoneMetadata,
    deleted_at: DateTime<Utc>,
) -> AppResult<()> {
    let metadata_json = if metadata.direction_id.is_some() || metadata.skill_point_id.is_some() {
        Some(
            serde_json::to_string(&metadata)
                .map_err(|err| AppError::Validation(err.to_string()))?,
        )
    } else {
        None
    };

    query(
        "INSERT OR REPLACE INTO sync_tombstones (entity_type, entity_id, metadata, deleted_at) VALUES (?, ?, ?, ?)",
    )
    .bind(entity.as_str())
    .bind(entity_id.to_string())
    .bind(metadata_json)
    .bind(deleted_at.to_rfc3339())
    .execute(conn)
    .await?;

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletedDirection {
    pub id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletedSkillPoint {
    pub id: Uuid,
    pub direction_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletedMemoryCard {
    pub id: Uuid,
    pub direction_id: Uuid,
    pub skill_point_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityDelta<T, D> {
    pub updated: Vec<T>,
    pub deleted: Vec<D>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    pub since: Option<DateTime<Utc>>,
    pub cursor: DateTime<Utc>,
    pub directions: EntityDelta<Direction, DeletedDirection>,
    #[serde(rename = "skill_points")]
    pub skill_points: EntityDelta<SkillPoint, DeletedSkillPoint>,
    #[serde(rename = "memory_cards")]
    pub memory_cards: EntityDelta<MemoryCard, DeletedMemoryCard>,
}

pub struct SyncRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SyncRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn fetch_delta(&self, since: Option<DateTime<Utc>>) -> AppResult<SyncResponse> {
        let cursor = Utc::now();

        let directions_repo = DirectionRepository::new(self.pool);
        let skill_repo = SkillPointRepository::new(self.pool);
        let card_repo = MemoryCardRepository::new(self.pool);

        let updated_directions = directions_repo.list_updated_between(since, cursor).await?;
        let updated_skill_points = skill_repo.list_updated_between(since, cursor).await?;
        let updated_cards = card_repo.list_updated_between(since, cursor).await?;

        let tombstones = self.fetch_tombstones(since, cursor).await?;
        let mut direction_deletes = Vec::new();
        let mut skill_point_deletes = Vec::new();
        let mut card_deletes = Vec::new();

        for tombstone in tombstones {
            match tombstone.entity {
                SyncEntity::Direction => {
                    direction_deletes.push(DeletedDirection {
                        id: tombstone.entity_id,
                    });
                }
                SyncEntity::SkillPoint => {
                    if let Some(direction_id) = tombstone.metadata.direction_id {
                        skill_point_deletes.push(DeletedSkillPoint {
                            id: tombstone.entity_id,
                            direction_id,
                        });
                    }
                }
                SyncEntity::MemoryCard => {
                    if let Some(direction_id) = tombstone.metadata.direction_id {
                        card_deletes.push(DeletedMemoryCard {
                            id: tombstone.entity_id,
                            direction_id,
                            skill_point_id: tombstone.metadata.skill_point_id,
                        });
                    }
                }
            }
        }

        Ok(SyncResponse {
            since,
            cursor,
            directions: EntityDelta {
                updated: updated_directions,
                deleted: direction_deletes,
            },
            skill_points: EntityDelta {
                updated: updated_skill_points,
                deleted: skill_point_deletes,
            },
            memory_cards: EntityDelta {
                updated: updated_cards,
                deleted: card_deletes,
            },
        })
    }

    async fn fetch_tombstones(
        &self,
        since: Option<DateTime<Utc>>,
        until: DateTime<Utc>,
    ) -> AppResult<Vec<TombstoneRecord>> {
        let mut builder = QueryBuilder::<Sqlite>::new(
            "SELECT entity_type, entity_id, metadata, deleted_at FROM sync_tombstones WHERE deleted_at <= ",
        );
        builder.push_bind(until.to_rfc3339());

        if let Some(since) = since {
            builder.push(" AND deleted_at > ");
            builder.push_bind(since.to_rfc3339());
        }

        builder.push(" ORDER BY deleted_at ASC");

        let rows = builder.build().fetch_all(self.pool).await?;

        rows.into_iter()
            .map(|row| {
                let entity_type: String = row.get("entity_type");
                let Some(entity) = SyncEntity::from_str(&entity_type) else {
                    return Err(AppError::Validation(format!(
                        "unknown sync entity type: {entity_type}"
                    )));
                };

                let entity_id: String = row.get("entity_id");
                let entity_id = Uuid::parse_str(&entity_id)
                    .map_err(|err| AppError::Validation(err.to_string()))?;

                let metadata: Option<String> = row.get("metadata");
                let metadata = metadata
                    .map(|value| serde_json::from_str::<TombstoneMetadata>(&value))
                    .transpose()
                    .map_err(|err| AppError::Validation(err.to_string()))?
                    .unwrap_or_default();

                let deleted_at: String = row.get("deleted_at");
                let deleted_at = DateTime::parse_from_rfc3339(&deleted_at)
                    .map_err(|err| AppError::Validation(err.to_string()))?
                    .with_timezone(&Utc);

                Ok(TombstoneRecord {
                    entity,
                    entity_id,
                    metadata,
                    deleted_at,
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;
    use std::time::Duration;

    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::SqlitePool;

    use crate::domain::{
        CardType, Direction, DirectionDraft, DirectionStage, DirectionUpdate, MemoryCard,
        MemoryCardDraft, SkillLevel, SkillPoint, SkillPointDraft,
    };
    use crate::repositories::directions::DirectionRepository;
    use crate::repositories::memory_cards::MemoryCardRepository;
    use crate::repositories::skill_points::SkillPointRepository;

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

    async fn seed_fixtures(pool: &SqlitePool) -> (Direction, SkillPoint, MemoryCard) {
        let directions = DirectionRepository::new(pool);
        let skills = SkillPointRepository::new(pool);
        let cards = MemoryCardRepository::new(pool);

        let direction = directions
            .create(DirectionDraft {
                name: "Shape vision".to_string(),
                stage: DirectionStage::Shape,
                quarterly_goal: Some("Refine execution".to_string()),
            })
            .await
            .expect("direction created");

        let skill = skills
            .create(
                direction.id,
                SkillPointDraft {
                    name: "Pitch iteration".to_string(),
                    summary: Some("Practice weekly".to_string()),
                    level: Some(SkillLevel::Working),
                },
            )
            .await
            .expect("skill created");

        let card = cards
            .create(
                direction.id,
                MemoryCardDraft {
                    skill_point_id: Some(skill.id),
                    title: "Narrative arc".to_string(),
                    body: "Highlight tension, insight, action".to_string(),
                    card_type: CardType::Concept,
                    stability: Some(0.6),
                    relevance: Some(0.7),
                    novelty: Some(0.4),
                    priority: None,
                    next_due: None,
                },
            )
            .await
            .expect("card created");

        (direction, skill, card)
    }

    #[tokio::test]
    async fn fetch_delta_without_since_returns_current_records() {
        let pool = setup_pool().await;
        let (direction, skill, card) = seed_fixtures(&pool).await;

        let repo = SyncRepository::new(&pool);
        let delta = repo.fetch_delta(None).await.expect("delta fetched");

        assert!(delta.since.is_none());
        assert!(delta.cursor > direction.updated_at);

        assert!(delta
            .directions
            .updated
            .iter()
            .any(|entry| entry.id == direction.id));
        assert!(delta
            .skill_points
            .updated
            .iter()
            .any(|entry| entry.id == skill.id));
        assert!(delta
            .memory_cards
            .updated
            .iter()
            .any(|entry| entry.id == card.id));
        assert!(delta.skill_points.deleted.is_empty());
        assert!(delta.memory_cards.deleted.is_empty());
    }

    #[tokio::test]
    async fn fetch_delta_since_returns_updates_and_tombstones() {
        let pool = setup_pool().await;
        let (direction, skill, card) = seed_fixtures(&pool).await;

        let repo = SyncRepository::new(&pool);
        let initial = repo.fetch_delta(None).await.expect("initial delta");
        let cursor = initial.cursor;

        tokio::time::sleep(Duration::from_millis(10)).await;

        let directions = DirectionRepository::new(&pool);
        let updated_direction = directions
            .update(
                direction.id,
                DirectionUpdate {
                    name: Some("Refine vision".to_string()),
                    stage: None,
                    quarterly_goal: None,
                },
            )
            .await
            .expect("direction updated")
            .expect("direction exists");

        tokio::time::sleep(Duration::from_millis(10)).await;

        let skills = SkillPointRepository::new(&pool);
        assert!(skills.delete(skill.id).await.expect("skill deleted"));

        let delta = repo.fetch_delta(Some(cursor)).await.expect("delta fetched");

        assert_eq!(delta.since, Some(cursor));
        assert!(delta.cursor > cursor);
        assert_eq!(delta.directions.updated.len(), 1);
        assert_eq!(delta.skill_points.deleted.len(), 1);
        assert!(delta.memory_cards.deleted.is_empty());

        let updated_entry = delta
            .directions
            .updated
            .iter()
            .find(|entry| entry.id == updated_direction.id)
            .expect("direction present");
        assert_eq!(updated_entry.name, "Refine vision");

        let deleted_skill = delta
            .skill_points
            .deleted
            .iter()
            .find(|entry| entry.id == skill.id)
            .expect("skill tombstone present");
        assert_eq!(deleted_skill.direction_id, direction.id);

        assert!(delta
            .memory_cards
            .updated
            .iter()
            .any(|entry| entry.id == card.id && entry.skill_point_id.is_none()));
    }
}
