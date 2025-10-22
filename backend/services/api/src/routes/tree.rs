use std::collections::{HashMap, HashSet};

use axum::extract::State;
use axum::{routing::get, Json, Router};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::{CardType, Direction, DirectionStage, MemoryCard, SkillPoint};
use crate::error::AppResult;
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
    generated_at: DateTime<Utc>,
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
}

#[derive(Debug, Serialize)]
struct TreeSkillPointBranch {
    skill_point: SkillPoint,
    card_count: usize,
    cards: Vec<TreeCardSummary>,
}

#[derive(Debug, Serialize)]
struct TreeCardSummary {
    id: Uuid,
    skill_point_id: Option<Uuid>,
    title: String,
    body: String,
    card_type: CardType,
}

impl From<MemoryCard> for TreeCardSummary {
    fn from(card: MemoryCard) -> Self {
        Self {
            id: card.id,
            skill_point_id: card.skill_point_id,
            title: card.title,
            body: card.body,
            card_type: card.card_type,
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
        let skill_point_ids: HashSet<Uuid> = skill_points.iter().map(|skill| skill.id).collect();
        let cards = card_repo.list_by_direction(direction.id, None).await?;
        let card_summaries: Vec<TreeCardSummary> = cards.into_iter().map(Into::into).collect();

        let mut grouped_cards: HashMap<Option<Uuid>, Vec<TreeCardSummary>> = HashMap::new();
        for mut card in card_summaries {
            let key = match card.skill_point_id {
                Some(skill_id) if skill_point_ids.contains(&skill_id) => Some(skill_id),
                _ => {
                    card.skill_point_id = None;
                    None
                }
            };

            grouped_cards.entry(key).or_insert_with(Vec::new).push(card);
        }

        let mut skill_branches_with_rank = Vec::with_capacity(skill_points.len());

        for skill in skill_points {
            let level_rank = skill.level.as_i32();
            let mut cards = grouped_cards.remove(&Some(skill.id)).unwrap_or_default();
            cards.sort_by(|a, b| a.title.cmp(&b.title));

            let branch = TreeSkillPointBranch {
                card_count: cards.len(),
                cards,
                skill_point: skill,
            };

            skill_branches_with_rank.push((level_rank, branch));
        }

        skill_branches_with_rank.sort_by(|(a_level, a_branch), (b_level, b_branch)| {
            b_level
                .cmp(a_level)
                .then_with(|| b_branch.card_count.cmp(&a_branch.card_count))
                .then_with(|| a_branch.skill_point.name.cmp(&b_branch.skill_point.name))
        });

        let skill_branches: Vec<TreeSkillPointBranch> = skill_branches_with_rank
            .into_iter()
            .map(|(_, branch)| branch)
            .collect();

        let mut orphan_cards = grouped_cards.remove(&None).unwrap_or_default();
        orphan_cards.sort_by(|a, b| a.title.cmp(&b.title));

        let metrics = TreeDirectionMetrics {
            skill_point_count: skill_branches.len(),
            card_count: skill_branches
                .iter()
                .map(|branch| branch.card_count)
                .sum::<usize>()
                + orphan_cards.len(),
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
        generated_at: Utc::now(),
        directions: branches,
    }))
}

fn stage_rank(stage: &DirectionStage) -> i32 {
    match stage {
        DirectionStage::Explore => 0,
        DirectionStage::Shape => 1,
        DirectionStage::Attack => 2,
        DirectionStage::Stabilize => 3,
    }
}
