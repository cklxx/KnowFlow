use std::{fs, sync::Arc};

use axum_test::TestServer;
use backend::clients::volcengine::VolcengineClient;
use backend::routes::{create_router, AppState};
use backend::services::aggregator::Aggregator;
use backend::services::assets::AssetStore;
use backend::services::digest::DigestService;
use backend::services::summarizer::Summarizer;
use backend::services::tts::TtsService;
use base64::Engine;
use serde_json::Value;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn daily_digest_pipeline_returns_items_with_audio() {
    dotenvy::dotenv().ok();

    let mock_server = MockServer::start().await;

    let feed_body = format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\">\n<title>Test Feed</title>\n<id>feed</id>\n<updated>2024-07-01T00:00:00Z</updated>\n<entry>\n<id>tag:test</id>\n<title>AI 新工具上线</title>\n<updated>2024-07-01T00:00:00Z</updated>\n<summary>这是一段摘要，用来测试。</summary>\n<link href=\"https://example.com/article\"/>\n</entry>\n</feed>"
    );

    Mock::given(method("GET"))
        .and(path("/feed"))
        .respond_with(ResponseTemplate::new(200).set_body_raw(feed_body, "application/atom+xml"))
        .mount(&mock_server)
        .await;

    let summary_payload = serde_json::json!({
        "headline": "不焦虑地跟上",
        "happened": ["大公司发布新的 AI 工具"],
        "impact": ["普通人也能免费试用"],
        "actions": ["可以先体验看看，暂时不花钱"],
        "one_minute": "今天的大新闻是一个不需要写代码的 AI 工具上线。"
    })
    .to_string();

    let chat_response = serde_json::json!({
        "choices": [
            {
                "message": {
                    "content": summary_payload
                }
            }
        ]
    });

    Mock::given(method("POST"))
        .and(path("/api/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response))
        .mount(&mock_server)
        .await;

    let audio = base64::engine::general_purpose::STANDARD.encode("audio");
    let tts_response = serde_json::json!({ "audio_base64": audio });

    Mock::given(method("POST"))
        .and(path("/api/v1/tts"))
        .respond_with(ResponseTemplate::new(200).set_body_json(tts_response))
        .mount(&mock_server)
        .await;

    let feed_url = format!("{}/feed", mock_server.uri());
    let aggregator = Aggregator::new(vec![feed_url.parse().unwrap()], 3).expect("aggregator");

    let volcengine_client = VolcengineClient::new(
        mock_server.uri().parse().unwrap(),
        "test-key".to_string(),
        "ep-llama".to_string(),
        "zh_female".to_string(),
    )
    .expect("client");

    let summarizer = Summarizer::new(Some(volcengine_client.clone()));
    let tts_service = TtsService::new(volcengine_client.clone());
    let asset_dir = tempfile::tempdir().expect("asset tempdir");
    let asset_path = asset_dir.path().to_path_buf();
    let asset_store = AssetStore::new(asset_path.clone(), "/static");
    let static_prefix = asset_store.static_prefix().to_string();

    let digest_service =
        DigestService::new(aggregator, summarizer, Some(tts_service), 1, asset_store);

    let state = AppState {
        digest_service: Arc::new(digest_service),
        asset_dir: asset_path.clone(),
    };

    let router = create_router(state);
    let server = TestServer::new(router).unwrap();

    let response = server.get("/api/digest/today").await;
    response.assert_status_ok();
    let json: Value = response.json::<Value>();

    let items = json["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["headline"], "不焦虑地跟上");
    assert_eq!(items[0]["audio_base64"], "YXVkaW8=");

    let audio_url = items[0]["audio_url"].as_str().expect("audio url");
    let transcript_url = items[0]["transcript_url"].as_str().expect("transcript url");

    assert!(audio_url.starts_with(&static_prefix));
    assert!(transcript_url.starts_with(&static_prefix));

    let audio_path_rel = audio_url
        .strip_prefix(&static_prefix)
        .unwrap_or(audio_url)
        .trim_start_matches('/');
    let transcript_path_rel = transcript_url
        .strip_prefix(&static_prefix)
        .unwrap_or(transcript_url)
        .trim_start_matches('/');

    let audio_path = asset_path.join(audio_path_rel);
    let transcript_path = asset_path.join(transcript_path_rel);

    assert!(audio_path.exists(), "audio asset should exist");
    assert!(transcript_path.exists(), "transcript asset should exist");

    let transcript_content = fs::read_to_string(transcript_path).expect("transcript content");
    assert!(transcript_content.contains("🧠"));
}

#[tokio::test]
async fn daily_digest_pipeline_degrades_without_api_key() {
    dotenvy::dotenv().ok();

    let mock_server = MockServer::start().await;

    let feed_body = format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\">\n<title>Test Feed</title>\n<id>feed</id>\n<updated>2024-07-01T00:00:00Z</updated>\n<entry>\n<id>tag:test</id>\n<title>AI 新工具上线</title>\n<updated>2024-07-01T00:00:00Z</updated>\n<summary>这是一段摘要，用来测试。</summary>\n<link href=\"https://example.com/article\"/>\n</entry>\n</feed>",
    );

    Mock::given(method("GET"))
        .and(path("/feed"))
        .respond_with(ResponseTemplate::new(200).set_body_raw(feed_body, "application/atom+xml"))
        .mount(&mock_server)
        .await;

    let feed_url = format!("{}/feed", mock_server.uri());
    let aggregator = Aggregator::new(vec![feed_url.parse().unwrap()], 3).expect("aggregator");

    let summarizer = Summarizer::new(None);
    let asset_dir = tempfile::tempdir().expect("asset tempdir");
    let asset_path = asset_dir.path().to_path_buf();
    let asset_store = AssetStore::new(asset_path.clone(), "/static");

    let digest_service = DigestService::new(aggregator, summarizer, None, 1, asset_store);

    let state = AppState {
        digest_service: Arc::new(digest_service),
        asset_dir: asset_path.clone(),
    };

    let router = create_router(state);
    let server = TestServer::new(router).unwrap();

    let response = server.get("/api/digest/today").await;
    response.assert_status_ok();
    let json: Value = response.json::<Value>();

    let items = json["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    assert!(items[0]["headline"].as_str().unwrap().len() >= 1);
    assert!(items[0]["audio_base64"].is_null());
    assert!(items[0]["audio_url"].is_null());
    assert!(items[0]["text_summary"]
        .as_str()
        .unwrap()
        .contains("AI 动态"));
    assert!(items[0]["transcript_url"].as_str().is_some());
}
