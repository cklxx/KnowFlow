# AI 小耳朵后端（Rust）

Rust + Axum 实现的「AI 小耳朵」服务端，负责：

1. 聚合最新 AI 资讯（RSS）
2. 调用火山引擎大模型生成口语化文字摘要
3. 调用火山引擎语音模型合成温柔播报音频
4. 以统一 JSON 返回文字与音频（Base64）

## 运行步骤

```bash
cp .env.example .env   # 可填写 VOLCENGINE_API_KEY（留空则仅返回文字摘要）
cargo run              # 默认监听 0.0.0.0:8080
```

接口：

- `GET /health`
- `GET /api/digest/today`
- `/static/...`：访问生成的语音与文字稿文件

返回示例：

```json
{
  "date": "2024-07-01",
  "intro": "今天帮你挑了 3 条 AI 新鲜事，一起用耳朵听听看。",
  "items": [
    {
      "headline": "AI 帮你省时",
      "happened": ["某公司发布 AI 家务助手"],
      "impact": ["普通人可以免费试用"],
      "actions": ["可以先体验看看，暂时不花钱"],
      "text_summary": "60 秒里告诉你这件事的来龙去脉",
      "audio_base64": "...",
      "audio_url": "/static/audio/20240702-item-01.mp3",
      "transcript_url": "/static/transcripts/20240702-item-01.md",
      "source_url": "https://example.com",
      "published_at": "2024-06-30T18:00:00Z"
    }
  ],
  "one_minute_brief": "把 3 条资讯串成的一分钟温柔播报"
}
```

## 配置说明

环境变量（见 `.env.example`）：

| 变量 | 说明 |
| --- | --- |
| `VOLCENGINE_API_KEY` | 火山引擎统一密钥（可选，缺省回退为“仅文字”模式） |
| `VOLCENGINE_BASE_URL` | API Endpoint，可选 |
| `VOLCENGINE_CHAT_MODEL` | 摘要使用的模型，默认 `ep-llama-3-8b-instruct` |
| `VOLCENGINE_TTS_VOICE` | 语音音色，默认 `zh_female_xiaoyun` |
| `RSS_FEEDS` | 资讯源列表，逗号分隔 |
| `DAILY_ITEM_COUNT` | 每日推送条数，默认 3 |
| `BIND_ADDRESS` | 服务监听地址 |
| `ASSET_DIR` | 语音与文字稿的输出目录，默认 `static` |
| `STATIC_URL_PREFIX` | 静态资源访问前缀，默认 `/static` |

> 后端会自动将文字稿写入 `static/transcripts/`，音频写入 `static/audio/`，并通过 `/static` 目录对外暴露，方便前端直接播放或下载。

## 测试

项目使用 `wiremock` 全链路模拟火山引擎接口：

```bash
cargo test
```

测试会启动一个伪造的 RSS + Volcengine 服务器，确保“抓取 → 摘要 → 合成语音 → API 输出”逻辑可靠。
