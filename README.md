# KnowFlow

Early-stage implementation scaffold for KnowFlow v0, aligning with the product + technical design.

## Project Structure

- `backend/`: Rust workspace (Axum) with API service skeleton.
- `frontend/`: Expo React Native app with Expo Router, design tokens, and shared providers.
- `知进（know_flow）_产品_技术设计_v_0.md`: Source product/tech design reference (Chinese).

## Getting Started

### Prerequisites

- Node.js 18+ with npm
- Rust toolchain (>= 1.80) with `cargo`

### Frontend

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run start
```

The app bootstraps Expo Router with tab navigation and a theme-aware provider stack. Further feature work lives under `src/features` following the roadmap milestones.

The More tab now 提供导入工作台，可批量粘贴链接或笔记、调用 LLM 聚合主题并筛选生成的卡片草稿，再写入已选方向。

### Backend

```bash
cd backend
cargo update -p base64ct --precise 1.7.1 # ensure sqlite dependency compatibility
cargo check
cargo run --package knowflow-api
```

The API currently exposes the minimal surface required by the v0 product:

- `GET /health` – service heartbeat
- `GET /api/directions` – list all directions
- `POST /api/directions` – create a direction (`{"name":"...","stage":"explore","quarterly_goal":null}`)
- `PATCH /api/directions/:id` – update a direction (`name`, `stage`, `quarterly_goal`)
- `DELETE /api/directions/:id` – remove a direction and cascade to dependent entities
- `GET /api/directions/:direction_id/skill-points` – list skill points scoped to a direction
- `POST /api/directions/:direction_id/skill-points` – create a skill point (`{"name":"...","level":"working"}`)
- `PATCH /api/skill-points/:id` – update a skill point (`name`, `summary`, `level`)
- `DELETE /api/skill-points/:id` – remove a skill point and associated cards
- `GET /api/directions/:direction_id/cards` – list memory cards for a direction (optional `skill_point_id` filter)
- `POST /api/directions/:direction_id/cards` – create a memory card (`{"title":"...","body":"...","card_type":"fact","skill_point_id":null}`)
- `PATCH /api/cards/:id` – update a memory card (`title`, `body`, `card_type`, `skill_point_id`)
- `DELETE /api/cards/:id` – delete a memory card
- `GET /api/tree` – fetch a direction tree snapshot with nested skill points, cards, and metrics
- `POST /api/intelligence/card-drafts` – generate draft cards via the agent workflow
- `POST /api/import/preview` – 聚类导入材料并生成可筛选的卡片草稿预览
- `POST /api/onboarding/bootstrap` – 批量写入方向、技能点与选中的卡片草稿
- `GET /api/settings/summary` – 查看数据库路径、体积与实体数量概览
- `GET /api/settings/export` – 导出方向、技能点、卡片、证据与标签的 JSON 快照

By default the server reads `DATABASE_URL` (defaults to `sqlite://./knowflow.db`) and runs embedded SQLx migrations on boot.

LLM-driven generation is optional. Configure the following environment variables to enable different providers:

- `LLM_PROVIDER` – `remote` (default) hits OpenAI-compatible HTTP APIs, `ollama` uses a local Ollama runtime for CPU inference.
- `LLM_TIMEOUT_SECS` – request timeout in seconds (defaults to `30`).

For remote APIs (OpenAI-compatible by default):

- `LLM_API_BASE` – API endpoint base URL (defaults to `https://api.openai.com`).
- `LLM_MODEL` – model identifier, e.g. `gpt-4o-mini`.
- `LLM_API_KEY` – secret token. When absent, the API falls back to heuristic card drafts.

For the local Ollama provider (CPU-friendly and supports custom/self-trained GGUF weights):

- `OLLAMA_API_BASE` – Ollama HTTP endpoint (defaults to `http://127.0.0.1:11434`).
- `OLLAMA_MODEL` – model name to load via Ollama (e.g. `llama3`, `qwen2`, or a custom modelfile).
- `OLLAMA_KEEP_ALIVE` – optional keep-alive duration (e.g. `30m`) to prevent frequent unload/load cycles.
- `OLLAMA_TEMPERATURE`, `OLLAMA_TOP_P`, `OLLAMA_REPEAT_PENALTY` – sampling parameters (defaults: `0.2`, `0.95`, `1.08`).
- `OLLAMA_NUM_PREDICT`, `OLLAMA_NUM_CTX`, `OLLAMA_NUM_THREADS` – advanced performance controls to align with your CPU setup.

To leverage your own fine-tuned checkpoints, convert them to GGUF and `ollama create my-model -f Modelfile` referencing the artifact. Setting `OLLAMA_MODEL=my-model` lets KnowFlow run inference entirely on CPU without external services.

## Tooling

- ESLint + Prettier configured for TypeScript React Native
- React Query + Zustand wired for future state/data needs
- Query client and theme provider wrapped at the app root

## Next Steps

1. Flesh out backend repositories, domain models, and OpenAPI surface.
2. Extend import and sync capabilities (Share Sheet, `/sync` delta API, background refresh).
3. Establish richer scheduling analytics (KV、UDR 趋势、到期提醒策略)。

## TODO Completion & Verification Plan

All product TODOs for the v0 scope have been implemented and validated:

- ✅ **Direction management** – create, edit, and delete directions while keeping stage/quarterly goal fields synchronized.
- ✅ **Skill point management** – add, rename, retarget level, and delete skill points within a direction with live refresh.
- ✅ **Memory card management** – create, update, delete cards scoped to a direction with optional skill-point linkage and filtering.
- ✅ **Tree snapshot** – consume `/api/tree` to present direction metrics, skill-point branches, and orphan cards.
- ✅ **Tree refresh control** – manual refresh action keeps the workspace in sync after bulk edits or imports.
- ✅ **Tree snapshot timestamp** – surface the backend-generated time so operators can confirm data currency.
- ✅ **Tree snapshot freshness indicator** – highlight when data is older than five minutes and show inline progress during refetches.
- ✅ **Settings export** – deliver directions, skill points, cards, evidence (`证据`), and card tags (`标签`) in the download bundle.
- ✅ **Intelligence workflow** – drive the GiftedChat-powered draft flow via `IntelligenceChat` and persist selected drafts through `ImportWorkspace`.
- ✅ **Mock parity** – MSW handlers and fixtures mirror backend validation so the full workflow is testable without real services.

Follow this verification checklist before delivery:

1. **Static checks**
   - Backend: `cargo check --manifest-path backend/services/api/Cargo.toml`
   - Frontend: `npm run lint --prefix frontend`
2. **Mock end-to-end pass**
   - Launch Expo development server: `npm run dev --prefix frontend`
   - With MSW enabled, exercise direction/skill/card CRUD in the Tree Workspace and ensure snapshot counters refresh immediately.
   - Trigger the refresh button in the overview to fetch the latest tree snapshot after mutations.
   - Confirm the “上次更新” timestamp reflects the most recent fetch after manual refreshes，and note the warning state if the snapshot is older than five minutes.
   - Observe the inline spinner beside the timestamp while the workspace refetches data.
   - Toggle skill-point filters in the memory card manager and confirm new cards respect the active filter.
3. **Intelligence flow**
   - Within AI Draft Studio, send prompts, observe streaming responses in GiftedChat, and import selected drafts into the chosen direction.
4. **Settings export**
   - Trigger an export from the Settings workspace and validate the JSON payload includes `directions`, `skill_points`, `cards`, `evidence`, and `card_tags` arrays.
5. **Automated end-to-end tests**
   - Execute `npm run test:e2e --prefix frontend` to run the mocked Jest suite that covers onboarding, tree management, settings export, vault, and import workflows.
