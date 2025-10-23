use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::error::{AppError, AppResult};
use crate::repositories::sync::{SyncRepository, SyncResponse};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/sync", get(fetch_delta))
}

#[derive(Debug, Deserialize)]
struct SyncQuery {
    #[serde(default)]
    since: Option<String>,
}

async fn fetch_delta(
    State(state): State<AppState>,
    Query(params): Query<SyncQuery>,
) -> AppResult<Json<SyncResponse>> {
    let since = params
        .since
        .map(|value| DateTime::parse_from_rfc3339(&value))
        .transpose()
        .map_err(|err| AppError::Validation(format!("invalid since parameter: {err}")))?
        .map(|value| value.with_timezone(&Utc));

    let repo = SyncRepository::new(state.pool());
    let delta = repo.fetch_delta(since).await?;

    Ok(Json(delta))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;
    use std::time::Duration;

    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::SqlitePool;
    use tower::util::ServiceExt;
    use uuid::Uuid;

    use crate::config::{LlmProviderConfig, LlmSettings, RemoteLlmConfig};
    use crate::domain::{
        CardType, DirectionDraft, DirectionStage, DirectionUpdate, MemoryCardDraft, SkillLevel,
        SkillPointDraft,
    };
    use crate::repositories::directions::DirectionRepository;
    use crate::repositories::memory_cards::MemoryCardRepository;
    use crate::repositories::skill_points::SkillPointRepository;
    use crate::services::llm::LlmClient;
    use crate::state::AppState;

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

    fn dummy_llm() -> LlmClient {
        let settings = LlmSettings {
            provider: LlmProviderConfig::Remote(RemoteLlmConfig {
                base_url: "http://localhost".to_string(),
                api_key: None,
                model: "test-model".to_string(),
            }),
            timeout: Duration::from_secs(5),
        };

        LlmClient::new(settings).expect("llm client")
    }

    async fn seed_fixtures(pool: &SqlitePool) -> (Uuid, Uuid, Uuid) {
        let directions = DirectionRepository::new(pool);
        let skills = SkillPointRepository::new(pool);
        let cards = MemoryCardRepository::new(pool);

        let direction = directions
            .create(DirectionDraft {
                name: "Initial direction".to_string(),
                stage: DirectionStage::Explore,
                quarterly_goal: None,
            })
            .await
            .expect("direction created");

        let skill = skills
            .create(
                direction.id,
                SkillPointDraft {
                    name: "Skill".to_string(),
                    summary: None,
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
                    title: "Card".to_string(),
                    body: "Body".to_string(),
                    card_type: CardType::Concept,
                    stability: Some(0.5),
                    relevance: Some(0.7),
                    novelty: Some(0.3),
                    priority: None,
                    next_due: None,
                },
            )
            .await
            .expect("card created");

        (direction.id, skill.id, card.id)
    }

    #[tokio::test]
    async fn sync_route_serves_initial_payload() {
        let pool = setup_pool().await;
        let (direction_id, skill_id, card_id) = seed_fixtures(&pool).await;

        let state = AppState::new(pool.clone(), dummy_llm());
        let app = router().with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/sync")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::OK);

        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        let payload: SyncResponse = serde_json::from_slice(&bytes).expect("payload");

        assert!(payload
            .directions
            .updated
            .iter()
            .any(|d| d.id == direction_id));
        assert!(payload
            .skill_points
            .updated
            .iter()
            .any(|s| s.id == skill_id));
        assert!(payload.memory_cards.updated.iter().any(|c| c.id == card_id));
        assert!(payload.skill_points.deleted.is_empty());
    }

    #[tokio::test]
    async fn sync_route_applies_since_cursor() {
        let pool = setup_pool().await;
        let (direction_id, skill_id, card_id) = seed_fixtures(&pool).await;

        let state = AppState::new(pool.clone(), dummy_llm());
        let app = router().with_state(state.clone());

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/sync")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        let initial: SyncResponse = serde_json::from_slice(&bytes).expect("payload");
        let cursor = initial.cursor;

        tokio::time::sleep(Duration::from_millis(10)).await;

        let directions = DirectionRepository::new(&pool);
        directions
            .update(
                direction_id,
                DirectionUpdate {
                    name: Some("Renamed".to_string()),
                    stage: None,
                    quarterly_goal: None,
                },
            )
            .await
            .expect("direction updated")
            .expect("direction exists");

        tokio::time::sleep(Duration::from_millis(10)).await;

        let skills = SkillPointRepository::new(&pool);
        assert!(skills.delete(skill_id).await.expect("skill deleted"));

        let uri = format!(
            "/api/sync?since={}",
            cursor.to_rfc3339().replace('+', "%2B")
        );
        let response = app
            .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::OK);

        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        let delta: SyncResponse = serde_json::from_slice(&bytes).expect("payload");

        assert_eq!(delta.since, Some(cursor));
        assert!(delta.cursor > cursor);
        assert!(delta
            .directions
            .updated
            .iter()
            .any(|entry| entry.id == direction_id && entry.name == "Renamed"));
        assert!(delta
            .skill_points
            .deleted
            .iter()
            .any(|entry| entry.id == skill_id));
        assert!(delta
            .memory_cards
            .updated
            .iter()
            .any(|entry| entry.id == card_id && entry.skill_point_id.is_none()));
    }
}
