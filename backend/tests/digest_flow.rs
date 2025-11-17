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

    mock_feed(&mock_server).await;

    let summary_payload = serde_json::json!({
        "headline": "不焦虑地跟上",
        "happened": ["大公司发布新的 AI 工具"],
        "impact": ["普通人也能免费试用"],
        "actions": ["可以先体验看看，暂时不花钱"],
        "core_insights": ["普通人可以低成本跟上这波工具潮"],
        "info_checks": ["消息来自公司官网发布，可信度较高"],
        "more_thoughts": ["留意是否有隐私政策更新"],
        "key_questions": [
            {
                "question": "这个工具解决了什么？",
                "answer": "它用简单界面帮你自动处理复杂流程",
                "follow_up_question": "背后的模型是否经过安全评估？",
                "follow_up_answer": "文章说明通过了公司内部评审"
            },
            {
                "question": "我要马上行动吗？",
                "answer": "不用立刻付费，先试用看看有没有帮助",
                "follow_up_question": "试用期结束后价格会是多少？",
                "follow_up_answer": "暂未公布，但会提前邮件通知"
            }
        ],
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
    assert_eq!(items[0]["core_insights"].as_array().unwrap().len(), 1);
    assert_eq!(items[0]["info_checks"].as_array().unwrap().len(), 1);
    assert_eq!(items[0]["more_thoughts"].as_array().unwrap().len(), 1);
    assert_eq!(items[0]["key_questions"].as_array().unwrap().len(), 2);
    assert!(items[0]["key_questions"][0]["follow_up_question"].is_string());

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
    assert!(transcript_content.contains("🎯"));
    assert!(transcript_content.contains("🔍"));
    assert!(transcript_content.contains("💡"));
    assert!(transcript_content.contains("❓"));
}

#[tokio::test]
async fn daily_digest_pipeline_falls_back_when_summary_invalid() {
    dotenvy::dotenv().ok();

    let mock_server = MockServer::start().await;

    mock_feed(&mock_server).await;

    let chat_response = serde_json::json!({
        "choices": [
            {
                "message": {
                    "content": "{ not valid json }"
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
    assert_eq!(items[0]["headline"], "AI 新工具上线");
    assert_eq!(items[0]["audio_base64"], "YXVkaW8=");
    assert_eq!(
        items[0]["text_summary"],
        "今天有一条和你相关的 AI 动态：AI 新工具上线。简单来说：这是一段摘要，用来测试。"
    );
    assert_eq!(
        items[0]["core_insights"][0],
        "记住这条新闻揭示的关键变化，我们会帮你跟进后续。"
    );
    assert_eq!(
        items[0]["info_checks"][0],
        "来源为可靠媒体，但细节尚待更多渠道确认，我们会继续核实。"
    );
    assert_eq!(
        items[0]["more_thoughts"][0],
        "关注接下来是否有官方公告或专家分析，帮助判断影响范围。"
    );
    assert_eq!(
        items[0]["key_questions"][0]["question"],
        "这条消息最值得我关心的是什么？"
    );
    assert!(items[0]["key_questions"][0]["follow_up_question"].is_string());

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
    assert!(transcript_content.contains("🎯"));
    assert!(transcript_content.contains("🔍"));
    assert!(transcript_content.contains("💡"));
    assert!(transcript_content.contains("❓"));
    assert!(transcript_content.contains("这条消息最值得我关心的是什么？"));
}

#[tokio::test]
async fn daily_digest_pipeline_degrades_without_api_key() {
    dotenvy::dotenv().ok();

    let mock_server = MockServer::start().await;

    mock_feed(&mock_server).await;

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
    assert!(!items[0]["headline"].as_str().unwrap().is_empty());
    assert!(items[0]["audio_base64"].is_null());
    assert!(items[0]["audio_url"].is_null());
    assert!(items[0]["text_summary"]
        .as_str()
        .unwrap()
        .contains("AI 动态"));
    assert!(!items[0]["core_insights"].as_array().unwrap().is_empty());
    assert!(!items[0]["info_checks"].as_array().unwrap().is_empty());
    assert!(!items[0]["more_thoughts"].as_array().unwrap().is_empty());
    assert!(!items[0]["key_questions"].as_array().unwrap().is_empty());
    assert!(items[0]["transcript_url"].as_str().is_some());
}

async fn mock_feed(mock_server: &MockServer) {
    let feed_body = r#"<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>Test Feed</title>
<id>feed</id>
<updated>2024-07-01T00:00:00Z</updated>
<entry>
<id>tag:test</id>
<title>AI 新工具上线</title>
<updated>2024-07-01T00:00:00Z</updated>
<summary>这是一段摘要，用来测试。</summary>
<link href="https://example.com/article"/>
</entry>
</feed>"#
        .to_string();

    Mock::given(method("GET"))
        .and(path("/feed"))
        .respond_with(ResponseTemplate::new(200).set_body_raw(feed_body, "application/atom+xml"))
        .mount(mock_server)
        .await;
}
