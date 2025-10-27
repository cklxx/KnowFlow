# KnowFlow Frontend

Modern React-based H5 web application for the KnowFlow intelligent spaced repetition learning system.

## Technology Stack

- **React 18+** - UI library
- **TypeScript** - Type safety (strict mode enabled)
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **TanStack Query (React Query)** - Data fetching and caching
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API client and endpoints
│   ├── components/     # Reusable UI components
│   ├── features/       # Feature-based modules
│   │   ├── cards/
│   │   ├── intelligence/
│   │   ├── today/
│   │   └── ...
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Route page components
│   ├── store/          # Zustand stores
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Root component with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── Dockerfile          # Container build instructions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:3000`

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables (optional)
cp .env.example .env
```

### Development

```bash
# Start development server (http://localhost:5173)
npm run dev
```

The dev server includes:
- Hot Module Replacement (HMR)
- API proxy (`/api` → `http://localhost:3000`)
- TypeScript type checking
- Fast refresh

### Building

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build Docker image
docker build -t knowflow-frontend .

# Run container
docker run -p 8080:80 knowflow-frontend

# Or use docker-compose (from project root)
docker-compose up frontend
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run typecheck` - TypeScript type checking
- `npm run format` - Format code with Prettier

## API Integration

The frontend communicates with the backend API using:

- **Axios** for HTTP requests
- **TanStack Query** for data fetching, caching, and synchronization
- **Path aliases** for clean imports (`@api`, `@components`, etc.)

### Environment Variables

Create a `.env` file for custom configuration:

```env
# API base URL (optional, defaults to /api in dev)
VITE_API_BASE_URL=http://localhost:3000
```

## Features

### Pages

- **Home** (`/`) - Landing page with feature overview
- **Today** (`/today`) - Daily spaced repetition review
- **Intelligence** (`/intelligence`) - AI-powered card creation
- **Tree** (`/tree`) - Knowledge organization
- **Vault** (`/vault`) - Browse and manage all cards
- **Search** (`/search`) - Search across all cards
- **Settings** (`/settings`) - App configuration

### UI Components

Reusable component library in `src/components/`:
- Button (multiple variants and sizes)
- Card (container with variants)
- Input (with label and error support)
- Textarea (with label and error support)
- Loading (spinner)
- EmptyState (placeholder)

### State Management

- **Zustand stores** for client state (theme, selected direction)
- **TanStack Query** for server state (API data, caching)
- **React Context** (via Zustand) for global state

### Dark Mode

Full dark mode support using Tailwind's dark mode with system preference detection.

## Code Quality

- **TypeScript strict mode** - Maximum type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Path aliases** - Clean imports with `@/` prefix

## Production Deployment

The production build is optimized with:
- Code splitting (vendor chunks)
- Tree shaking
- Minification
- Gzip compression (via nginx)
- Static asset caching

Served via nginx with:
- SPA routing support
- Security headers
- Health check endpoint (`/health`)

## Contributing

1. Follow the existing code structure
2. Use TypeScript strict mode
3. Format code with Prettier
4. Run linter before committing
5. Ensure type checking passes

## License

MIT
