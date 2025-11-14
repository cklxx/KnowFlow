# AI 小耳朵 (KnowFlow)

「AI 小耳朵」是一款帮助家人轻松跟上 AI 世界的日常耳边伙伴。每天 10 分钟，通过温柔的语音和可读的文字，让她知道 AI 发生了什么、和生活有什么关系、需要不要采取行动。

## 仓库结构

- `backend/`：Rust + Axum 编写的服务端，整合 RSS 抓取、火山引擎大模型与语音合成。
- `frontend/`：保留历史前端目录（暂未启用）。
- `知进（know_flow）_产品_技术设计_v_0.md`：产品体验与技术蓝图，描述「AI 小耳朵」的核心场景与语气。

## 快速开始

> **只需配置一个火山引擎密钥**，即可同时启用大模型摘要与语音合成。

1. 准备环境
   ```bash
   cd backend
   cargo check
   ```
2. 配置密钥
   ```bash
   cp .env.example .env
   # 编辑 .env，可填写 VOLCENGINE_API_KEY=xxxxx（留空则仅输出文字摘要）
   ```
3. 启动服务
   ```bash
   cargo run
   ```

启动后默认监听 `http://0.0.0.0:8080`，可用接口：

- `GET /health`：健康检查
- `GET /api/digest/today`：返回当天 3 条精选资讯，包含文字摘要、音频（Base64）与静态文件链接
- `/static/...`：访问自动生成的语音与文字稿资源

## 核心能力

- **耳朵优先，文字辅助**：所有资讯均输出 60~120 秒语音稿，同时提供「一句话标题 + 三问三答」文字结构。
- **火山引擎一键整合**：同一 `VOLCENGINE_API_KEY` 即可调用抖音系大模型与语音服务，默认模型与音色开箱即用，缺省则回退为「仅文字」模式。
- **资讯精选**：预置 36Kr、The Verge 等 AI 资讯源，可在环境变量中追加或替换。
- **温柔语气模板**：提示词以“懂行朋友”的语气编写，强调非焦虑、生活化比喻。
- **静态资产落地**：每日生成的音频与文字稿会写入 `static/audio/`、`static/transcripts/` 并由 `/static` 路径直接提供。
- **测试覆盖**：通过 `wiremock` 模拟火山接口，验证“抓取 → 总结 → 生成音频 → 对外接口”全链路。

## 配置项

`.env.example` 已包含所有可调参数：

- `VOLCENGINE_API_KEY`（可选）：火山引擎通用 API Key，缺省时仅返回文字摘要。
- `VOLCENGINE_BASE_URL`：API 访问地址，默认 `https://open.volcengineapi.com`。
- `VOLCENGINE_CHAT_MODEL`：用于生成口语化摘要的模型，默认 `ep-llama-3-8b-instruct`。
- `VOLCENGINE_TTS_VOICE`：语音合成音色，默认 `zh_female_xiaoyun`。
- `RSS_FEEDS`：逗号分隔的 RSS 链接集合。
- `DAILY_ITEM_COUNT`：每日推送的资讯条数，默认 3。
- `BIND_ADDRESS`：服务绑定地址，默认 `0.0.0.0:8080`。
- `ASSET_DIR`：语音与文字稿输出目录，默认 `static`。
- `STATIC_URL_PREFIX`：静态资源访问前缀，默认 `/static`。

## 测试

```bash
cd backend
cargo test
```

## 后续路线

- 新增“老婆模式”管理端，用于丈夫挑选/标记重点资讯。
- 加入播放进度与听力反馈，驱动内容难度自适应。
- 与移动端/小程序前端打通，实现真正的“双耳双读”体验。
