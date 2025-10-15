use std::collections::HashMap;

use axum::extract::State;
use axum::{routing::get, Json, Router};
use chrono::{DateTime, Duration, Utc};
use serde::Serialize;
use sqlx::{QueryBuilder, Row, Sqlite, SqlitePool};
use uuid::Uuid;

use crate::domain::{CardType, Direction, DirectionStage, MemoryCard, SkillLevel, SkillPoint};
use crate::error::{AppError, AppResult};
use crate::repositories::{
    directions::DirectionRepository, memory_cards::MemoryCardRepository,
    skill_points::SkillPointRepository,
};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/tree", get(tree_snapshot))
}

#[derive(Debug, Serialize)]
struct TreeSnapshot {
    directions: Vec<TreeDirectionBranch>,
}

#[derive(Debug, Serialize)]
struct TreeDirectionBranch {
    direction: Direction,
    metrics: TreeDirectionMetrics,
    skill_points: Vec<TreeSkillPointBranch>,
    orphan_cards: Vec<TreeCardSummary>,
}

#[derive(Debug, Serialize)]
struct TreeDirectionMetrics {
    skill_point_count: usize,
    card_count: usize,
    fluent_points: usize,
    average_stability: f64,
    upcoming_reviews: usize,
}

#[derive(Debug, Serialize)]
struct TreeSkillPointBranch {
    skill_point: SkillPoint,
    card_count: usize,
    level_score: i32,
    cards: Vec<TreeCardSummary>,
}

#[derive(Debug, Serialize)]
struct TreeCardSummary {
    id: Uuid,
    skill_point_id: Option<Uuid>,
    title: String,
    body: String,
    card_type: CardType,
    stability: f64,
    relevance: f64,
    novelty: f64,
    priority: f64,
    next_due: Option<DateTime<Utc>>,
    evidence_count: i64,
    application_count: i64,
    last_applied_at: Option<DateTime<Utc>>,
}

impl From<MemoryCard> for TreeCardSummary {
    fn from(card: MemoryCard) -> Self {
        Self {
            id: card.id,
            skill_point_id: card.skill_point_id,
            title: card.title,
            body: card.body,
            card_type: card.card_type,
            stability: card.stability,
            relevance: card.relevance,
            novelty: card.novelty,
            priority: card.priority,
            next_due: card.next_due,
            evidence_count: 0,
            application_count: 0,
            last_applied_at: None,
        }
    }
}

async fn tree_snapshot(State(state): State<AppState>) -> AppResult<Json<TreeSnapshot>> {
    let pool = state.pool();
    let direction_repo = DirectionRepository::new(pool);
    let skill_repo = SkillPointRepository::new(pool);
    let card_repo = MemoryCardRepository::new(pool);

    let directions = direction_repo.list().await?;
    let mut branches = Vec::with_capacity(directions.len());

    for direction in directions {
        let skill_points = skill_repo.list_by_direction(direction.id).await?;
        let cards = card_repo.list_by_direction(direction.id).await?;
        let card_ids: Vec<Uuid> = cards.iter().map(|card| card.id).collect();
        let mut card_summaries: Vec<TreeCardSummary> = cards.into_iter().map(Into::into).collect();

        let evidence_counts = fetch_evidence_counts(pool, &card_ids).await?;
        let application_stats = fetch_application_stats(pool, &card_ids).await?;

        for card in &mut card_summaries {
            if let Some(count) = evidence_counts.get(&card.id) {
                card.evidence_count = *count;
            }
            if let Some(stats) = application_stats.get(&card.id) {
                card.application_count = stats.count;
                card.last_applied_at = stats.last_applied_at;
            }
        }

        let mut grouped_cards: HashMap<Option<Uuid>, Vec<TreeCardSummary>> = HashMap::new();
        for card in card_summaries {
            grouped_cards
                .entry(card.skill_point_id)
                .or_insert_with(Vec::new)
                .push(card);
        }

        let mut skill_branches = Vec::with_capacity(skill_points.len());
        let mut total_cards = 0usize;
        let mut stability_sum = 0.0f64;
        let mut upcoming_reviews = 0usize;
        let now = Utc::now();
        let upcoming_cutoff = now + Duration::days(3);

        for skill in skill_points {
            let mut cards = grouped_cards.remove(&Some(skill.id)).unwrap_or_default();
            cards.sort_by(|a, b| {
                b.priority
                    .partial_cmp(&a.priority)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            for card in &cards {
                total_cards += 1;
                stability_sum += card.stability;
                if let Some(next_due) = card.next_due {
                    if next_due <= upcoming_cutoff {
                        upcoming_reviews += 1;
                    }
                }
            }

            let level_score = skill.level.as_i32();
            let branch = TreeSkillPointBranch {
                card_count: cards.len(),
                cards,
                level_score,
                skill_point: skill,
            };
            skill_branches.push(branch);
        }

        let mut orphan_cards = grouped_cards.remove(&None).unwrap_or_default();
        orphan_cards.sort_by(|a, b| {
            b.priority
                .partial_cmp(&a.priority)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        for card in &orphan_cards {
            total_cards += 1;
            stability_sum += card.stability;
            if let Some(next_due) = card.next_due {
                if next_due <= upcoming_cutoff {
                    upcoming_reviews += 1;
                }
            }
        }

        skill_branches.sort_by(|a, b| {
            b.level_score
                .cmp(&a.level_score)
                .then_with(|| b.card_count.cmp(&a.card_count))
        });

        let fluent_points = skill_branches
            .iter()
            .filter(|branch| branch.skill_point.level == SkillLevel::Fluent)
            .count();

        let average_stability = if total_cards > 0 {
            stability_sum / total_cards as f64
        } else {
            0.0
        };

        let metrics = TreeDirectionMetrics {
            skill_point_count: skill_branches.len(),
            card_count: total_cards,
            fluent_points,
            average_stability,
            upcoming_reviews,
        };

        branches.push(TreeDirectionBranch {
            direction,
            metrics,
            skill_points: skill_branches,
            orphan_cards,
        });
    }

    branches.sort_by(|a, b| {
        stage_rank(&a.direction.stage)
            .cmp(&stage_rank(&b.direction.stage))
            .then_with(|| b.direction.updated_at.cmp(&a.direction.updated_at))
    });

    Ok(Json(TreeSnapshot {
        directions: branches,
    }))
}

struct ApplicationStats {
    count: i64,
    last_applied_at: Option<DateTime<Utc>>,
}

async fn fetch_evidence_counts(
    pool: &SqlitePool,
    card_ids: &[Uuid],
) -> AppResult<HashMap<Uuid, i64>> {
    if card_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let mut builder = QueryBuilder::<Sqlite>::new(
        "SELECT card_id, COUNT(*) as count FROM evidence WHERE card_id IN (",
    );
    let mut separated = builder.separated(", ");
    for id in card_ids {
        separated.push_bind(id.to_string());
    }
    builder.push(") GROUP BY card_id");

    let rows = builder.build().fetch_all(pool).await?;
    let mut map = HashMap::new();
    for row in rows {
        let card_id: String = row.try_get("card_id")?;
        let count: i64 = row.try_get("count")?;
        let uuid = Uuid::parse_str(&card_id)
            .map_err(|err| AppError::Other(format!("invalid card id {card_id}: {err}")))?;
        map.insert(uuid, count);
    }

    Ok(map)
}

fn stage_rank(stage: &DirectionStage) -> i32 {
    match stage {
        DirectionStage::Explore => 0,
        DirectionStage::Shape => 1,
        DirectionStage::Attack => 2,
        DirectionStage::Stabilize => 3,
    }
}

async fn fetch_application_stats(
    pool: &SqlitePool,
    card_ids: &[Uuid],
) -> AppResult<HashMap<Uuid, ApplicationStats>> {
    if card_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let mut builder = QueryBuilder::<Sqlite>::new(
        "SELECT card_id, COUNT(*) as count, MAX(noted_at) as last_applied_at FROM card_applications WHERE card_id IN (",
    );
    let mut separated = builder.separated(", ");
    for id in card_ids {
        separated.push_bind(id.to_string());
    }
    builder.push(") GROUP BY card_id");

    let rows = builder.build().fetch_all(pool).await?;
    let mut map = HashMap::new();
    for row in rows {
        let card_id: String = row.try_get("card_id")?;
        let count: i64 = row.try_get("count")?;
        let last_applied: Option<String> = row.try_get("last_applied_at")?;
        let uuid = Uuid::parse_str(&card_id)
            .map_err(|err| AppError::Other(format!("invalid card id {card_id}: {err}")))?;
        let last_applied_at = match last_applied {
            Some(value) => Some(
                DateTime::parse_from_rfc3339(&value)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|err| AppError::Other(format!("invalid timestamp {value}: {err}")))?,
            ),
            None => None,
        };
        map.insert(
            uuid,
            ApplicationStats {
                count,
                last_applied_at,
            },
        );
    }

    Ok(map)
}
