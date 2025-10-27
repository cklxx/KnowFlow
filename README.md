# KnowFlow

Early-stage implementation scaffold for KnowFlow v0, aligning with the product + technical design.

## Project Structure

- `backend/`: Rust workspace (Axum) with API service skeleton.
- `frontend/`: React web application built with Vite, TanStack Query, Zustand, and Tailwind CSS.
- `知进（know_flow）_产品_技术设计_v_0.md`: Source product/tech design reference (Chinese).

## Getting Started

### Prerequisites

- Node.js 18+ with npm (for React web frontend)
- Rust toolchain (>= 1.80) with `cargo` (for backend API)

### Frontend

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run dev
```

The app is a modern React single-page application built with:
- **Vite** for fast development and optimized production builds
- **React Router** for client-side routing
- **TanStack Query** for server state management and caching
- **Zustand** for lightweight local state management
- **Tailwind CSS** for utility-first styling

The frontend provides a comprehensive workspace for managing directions, skill points, and memory cards, with AI-powered card generation and import capabilities.

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

### One-command dev workflows

To boot both the backend and the React web app with a single command, use the helper scripts under `scripts/`:

```bash
# start backend + frontend together
./scripts/dev.sh

# or launch either side individually
./scripts/start-backend.sh
./scripts/start-frontend.sh
```

The frontend script installs dependencies on first run and starts the Vite development server on port `5173` (default), connecting to the backend API at `http://localhost:3000`.

### Docker Compose deployment

#### One-Click Deployment (Recommended)

Use the provided deployment script for a guided setup:

```bash
./deploy.sh
```

This script will:
- Check and create `.env` file if needed
- Validate LLM API configuration
- Build Docker images
- Start all services
- Verify health checks
- Display access URLs

After successful deployment:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

#### Manual Deployment

Alternatively, build and run both services manually:

```bash
# 1. Configure environment variables
cp .env.example .env
# Edit .env and set your LLM API credentials

# 2. Build and start services
docker compose up --build -d

# 3. View logs
docker compose logs -f

# 4. Stop services
docker compose down
```

The stack exposes the backend API on `http://localhost:3000` and serves the production-built React application via Nginx on `http://localhost:8080`. The frontend build is optimized with Vite and configured to proxy API requests to the backend service.

#### Environment Configuration

LLM-driven generation is optional. Configure the following environment variables in `.env` to enable different providers:

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

- **Frontend**: ESLint + Prettier configured for TypeScript React, Vite for blazing-fast HMR
- **State Management**: TanStack Query for server state caching, Zustand for client state
- **Styling**: Tailwind CSS for utility-first responsive design
- **Type Safety**: Full TypeScript coverage across frontend and backend interfaces

## Next Steps

1. Flesh out backend repositories, domain models, and OpenAPI surface.
2. Extend import and sync capabilities (`/sync` delta API, background refresh, browser extension support).
3. Establish richer scheduling analytics (KV、UDR 趋势、到期提醒策略)。
4. Add progressive web app (PWA) capabilities for offline support and installability.

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
   - Frontend: `npm run lint --prefix frontend` and `npm run typecheck --prefix frontend`
2. **Development workflow**
   - Launch Vite development server: `npm run dev --prefix frontend`
   - Access the application at `http://localhost:5173`
   - Exercise direction/skill/card CRUD in the Tree Workspace and ensure snapshot counters refresh immediately.
   - Trigger the refresh button in the overview to fetch the latest tree snapshot after mutations.
   - Confirm the "上次更新" timestamp reflects the most recent fetch after manual refreshes，and note the warning state if the snapshot is older than five minutes.
   - Observe the inline spinner beside the timestamp while the workspace refetches data.
   - Toggle skill-point filters in the memory card manager and confirm new cards respect the active filter.
3. **Intelligence flow**
   - Within AI Draft Studio, send prompts, observe responses, and import selected drafts into the chosen direction.
4. **Settings export**
   - Trigger an export from the Settings workspace and validate the JSON payload includes `directions`, `skill_points`, `cards`, `evidence`, and `card_tags` arrays.
5. **Production build**
   - Execute `npm run build --prefix frontend` to create optimized production assets
   - Preview the build with `npm run preview --prefix frontend`
   - Verify all features work correctly in the production build
