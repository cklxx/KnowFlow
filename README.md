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

### Backend

```bash
cd backend
cargo update -p base64ct --precise 1.7.1 # ensure sqlite dependency compatibility
cargo check
cargo run --package knowflow-api
```

The API currently exposes:

- `GET /health` – service heartbeat
- `GET /api/directions` – list all directions
- `POST /api/directions` – create a direction (`{"name":"...","stage":"explore","quarterly_goal":null}`)
- `PATCH /api/directions/:id` – update a direction payload fields (`name`, `stage`, `quarterly_goal`)
- `DELETE /api/directions/:id` – remove a direction and cascade to dependent entities
- `GET /api/directions/:direction_id/skill-points` – list skill points scoped to a direction
- `POST /api/directions/:direction_id/skill-points` – create a skill point (`{"name":"...","level":"working"}`)
- `PATCH /api/skill-points/:id` – update a skill point (`name`, `summary`, `level`)
- `DELETE /api/skill-points/:id` – remove a skill point and associated cards
- `GET /api/directions/:direction_id/cards` – list memory cards for a direction
- `POST /api/directions/:direction_id/cards` – create a memory card (`{"title":"...","body":"...","card_type":"fact"}`)
- `PATCH /api/cards/:id` – update a memory card fields (title/body/type/metrics)
- `DELETE /api/cards/:id` – delete a memory card

By default the server reads `DATABASE_URL` (defaults to `sqlite://./knowflow.db`) and runs embedded SQLx migrations on boot.

## Tooling

- ESLint + Prettier configured for TypeScript React Native
- React Query + Zustand wired for future state/data needs
- Query client and theme provider wrapped at the app root

## Next Steps

1. Flesh out backend repositories, domain models, and OpenAPI surface.
2. Implement onboarding flow screens (O-0 to O-6) using the Expo Router skeleton.
3. Establish SQLite schema, migration tooling, and storage adapters.
