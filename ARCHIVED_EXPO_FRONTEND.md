# ARCHIVED: Expo-Based Frontend Architecture

**NOTICE:** This document captures the original Expo-based React Native frontend architecture that was replaced in the KnowFlow project. This is maintained as historical reference for understanding the previous implementation.

**Archived on:** October 27, 2025

---

## Overview

The original KnowFlow frontend was built as a cross-platform application using Expo, React Native, and Expo Router, designed to run on iOS, Android, and web platforms. It featured a modern React 19 setup with comprehensive state management, API integration, and testing infrastructure.

## Technology Stack

### Core Framework
- **Expo**: ~54.0.13 (framework for universal React applications)
- **React**: 19.1.0 (UI library)
- **React DOM**: 19.1.0 (web rendering)
- **React Native**: 0.81.4 (cross-platform mobile framework)
- **React Native Web**: 0.21.1 (web compatibility layer)

### Navigation & Routing
- **Expo Router**: ^6.0.12 (file-based routing system)
- **@react-navigation/native**: ^7.0.0 (navigation primitives)
- **@react-navigation/native-stack**: ^7.0.0 (native stack navigator)
- **Expo Linking**: ^8.0.8 (deep linking support)

### State Management & Data Fetching
- **Zustand**: ^5.0.0 (lightweight state management)
- **@tanstack/react-query**: ^5.62.7 (async state management and caching)

### UI Components & Animation
- **React Native Gesture Handler**: ^2.19.0 (gesture system)
- **React Native Reanimated**: ^4.1.3 (animation library)
- **React Native Screens**: ^4.6.0 (native screen primitives)
- **React Native Safe Area Context**: ^5.4.1 (safe area handling)
- **React Native Gifted Chat**: ^2.5.0 (chat UI components)
- **React Native Worklets**: ^0.6.1 (JavaScript worklets)
- **React Native Worklets Core**: ^1.6.2 (worklet runtime)
- **Expo Status Bar**: ~3.0.8 (status bar control)

### Build & Development Tools
- **TypeScript**: ^5.6.3 (type safety)
- **Babel**: babel-preset-expo ~54.0.0 (JavaScript transpilation)
- **Webpack**: @expo/webpack-config ^19.0.1 (web bundling)
- **ESLint**: ^8.57.1 (code linting)
- **Prettier**: ^3.3.3 (code formatting)
- **@pmmmwh/react-refresh-webpack-plugin**: ^0.6.1 (hot module replacement)

### Testing Infrastructure
- **Jest**: ^29.7.0 (test framework)
- **jest-expo**: ^49.0.0 (Expo Jest preset)
- **@testing-library/react-native**: ^12.6.2 (component testing)
- **@testing-library/jest-native**: ^5.4.3 (native matchers)
- **MSW (Mock Service Worker)**: ^2.4.10 (API mocking)
- **react-test-renderer**: 19.1.0 (snapshot testing)

## Directory Structure

```
frontend/
├── app/                          # Expo Router file-based routing
│   ├── (tabs)/                   # Tab-based navigation group
│   │   ├── _layout.tsx           # Tab navigator layout
│   │   ├── today.tsx             # Today's workout screen
│   │   ├── search.tsx            # Search screen
│   │   ├── intelligence.tsx      # AI intelligence screen
│   │   ├── vault.tsx             # Vault/cards screen
│   │   ├── tree.tsx              # Tree workspace screen
│   │   └── more.tsx              # More options screen
│   ├── cards/
│   │   └── [id].tsx              # Dynamic card detail route
│   ├── onboarding/
│   │   └── index.tsx             # Onboarding flow
│   ├── settings.tsx              # Settings screen
│   ├── import.tsx                # Import workspace
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 screen
│
├── src/
│   ├── features/                 # Feature-based modules
│   │   ├── cards/                # Memory card management
│   │   ├── directions/           # Direction management
│   │   ├── import/               # Import functionality
│   │   ├── intelligence/         # AI intelligence features
│   │   ├── onboarding/           # Onboarding flows
│   │   ├── progress/             # Progress tracking
│   │   ├── search/               # Search functionality
│   │   ├── settings/             # Settings management
│   │   ├── today/                # Today's workout features
│   │   ├── tree/                 # Tree workspace components
│   │   └── vault/                # Vault/card storage
│   │
│   ├── lib/                      # Shared libraries
│   │   ├── api/                  # API client and endpoints
│   │   │   ├── client.ts         # HTTP client
│   │   │   ├── config.ts         # API configuration
│   │   │   ├── types.ts          # API type definitions
│   │   │   ├── cards.ts          # Card endpoints
│   │   │   ├── directions.ts    # Direction endpoints
│   │   │   ├── evidence.ts      # Evidence endpoints
│   │   │   ├── intelligence.ts  # Intelligence endpoints
│   │   │   ├── import.ts        # Import endpoints
│   │   │   ├── onboarding.ts    # Onboarding endpoints
│   │   │   ├── progress.ts      # Progress endpoints
│   │   │   ├── search.ts        # Search endpoints
│   │   │   ├── settings.ts      # Settings endpoints
│   │   │   ├── today.ts         # Today endpoints
│   │   │   ├── tree.ts          # Tree endpoints
│   │   │   ├── vault.ts         # Vault endpoints
│   │   │   ├── sync.ts          # Sync endpoints
│   │   │   └── index.ts         # API exports
│   │   └── formatters.ts        # Data formatting utilities
│   │
│   ├── mocks/                    # MSW mock server setup
│   │   ├── browser.ts            # Browser mock worker
│   │   ├── handlers.ts           # Request handlers
│   │   └── fixtures/             # Mock data fixtures
│   │       ├── directions.ts
│   │       ├── import.ts
│   │       ├── intelligence.ts
│   │       ├── progress.ts
│   │       ├── search.ts
│   │       ├── settings.ts
│   │       ├── todayWorkout.ts
│   │       └── vault.ts
│   │
│   ├── providers/                # React context providers
│   │   ├── app-provider.tsx     # Root app provider
│   │   ├── theme-provider.tsx   # Theme context
│   │   ├── toast-provider.tsx   # Toast notifications
│   │   ├── share-intent-provider.tsx  # Share intent handling
│   │   ├── query-lifecycle-provider.tsx  # Query lifecycle management
│   │   └── index.ts             # Provider exports
│   │
│   ├── ui/                       # UI design system
│   │   ├── components/          # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Screen.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── SegmentedControl.tsx
│   │   │   └── index.ts
│   │   ├── tokens/              # Design tokens
│   │   │   ├── colors.ts        # Color palette
│   │   │   ├── typography.ts    # Typography scale
│   │   │   ├── spacing.ts       # Spacing system
│   │   │   └── index.ts
│   │   └── theme.ts             # Theme configuration
│   │
│   └── types/                    # TypeScript type definitions
│       └── msw.d.ts             # MSW type declarations
│
├── web/                          # Web-specific code
│   └── emptyEntry.ts            # Web entry override
│
├── e2e/                          # End-to-end tests
│   └── **/*.test.ts(x)          # E2E test files
│
├── assets/                       # Static assets
│   ├── icon.png
│   ├── splash-icon.png
│   ├── adaptive-icon.png
│   └── favicon.png
│
├── docker/                       # Docker configuration
│
├── index.ts                      # Application entry point
├── app.json                      # Expo configuration
├── babel.config.js              # Babel configuration
├── webpack.config.js            # Webpack configuration (web)
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── jest.e2e.config.js           # Jest E2E configuration
├── jest.setup.ts                # Jest setup
├── jest.preload.ts              # Jest preload
├── jest.nativeModulesMock.js    # Native module mocks
├── .eslintrc.cjs                # ESLint configuration
├── eslint.config.cjs            # Additional ESLint config
├── .prettierrc.json             # Prettier configuration
└── Dockerfile                    # Container build instructions
```

## Key Configuration Files

### package.json Scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:e2e:live": "bash ../scripts/test-e2e-live.sh"
  }
}
```

### app.json (Expo Configuration)
- **New Architecture Enabled**: React Native's new architecture was enabled (`"newArchEnabled": true`)
- **Web Bundler**: Configured to use Webpack for web builds
- **Platform Support**: iOS (tablet support), Android (edge-to-edge, adaptive icons), Web (favicon)
- **Expo Router**: Async routes disabled, root set to `app` directory
- **Custom Scheme**: `knowflow://` for deep linking

### babel.config.js
- **Preset**: `babel-preset-expo` (Expo's Babel configuration)
- **Plugins**:
  - `module-resolver`: Path aliasing (`@/` → `./src`)
  - `react-native-reanimated/plugin`: Animation support
  - `react-refresh/babel`: Hot reloading in development

### webpack.config.js (Web Build)
- **Base**: Extended from `@expo/webpack-config`
- **Environment Variables**: Injected via DefinePlugin
  - `EXPO_ROUTER_APP_ROOT`
  - `EXPO_PUBLIC_USE_MOCKS`
  - `EXPO_ROUTER_IMPORT_MODE`
- **React Refresh**: HMR enabled in development
- **MSW Integration**: Mock service worker copied to build output
- **Path Aliases**: Resolved `@/`, `@api`, and custom entry points
- **Warning Suppression**: Ignored react-native-worklets critical dependency warnings

### tsconfig.json
- **Base**: Extended from `expo/tsconfig.base`
- **Strict Mode**: Enabled for type safety
- **Path Mapping**:
  - `@/*` → `src/*`
  - `@api/*` → `src/lib/api/*`
  - `@api` → `src/lib/api/index`
- **JSX**: `react-jsx` transform
- **Types**: React, React Native, Expo Router, Node

### Jest Configuration (jest.e2e.config.js)
- **Preset**: `jest-expo`
- **Test Pattern**: `e2e/**/*.test.ts?(x)`
- **Timeout**: 30 seconds
- **Module Mapping**: Path aliases aligned with TypeScript config
- **Transform Ignore**: Comprehensive whitelist for React Native modules

## Application Entry Point (index.ts)

The entry point implemented a sophisticated bootstrap process:

1. **Gesture Handler**: Imported first for proper initialization
2. **Mock Service Worker**: Conditionally started based on `EXPO_PUBLIC_USE_MOCKS`
3. **Platform-Specific Logic**:
   - **Web**: Custom React root rendering with AppProvider and TodayScreen
   - **Mobile**: Standard Expo Router entry point

## Notable Features and Patterns

### 1. File-Based Routing
- Leveraged Expo Router for automatic route generation
- Tab navigation using route groups: `app/(tabs)/`
- Dynamic routes for card details: `app/cards/[id].tsx`
- Typed navigation with route parameters

### 2. API Architecture
- Centralized API client in `src/lib/api/client.ts`
- Feature-specific endpoint modules (cards, directions, intelligence, etc.)
- Type-safe API calls with TypeScript
- Environment-based configuration (`EXPO_PUBLIC_API_BASE_URL`)

### 3. Mock Service Worker Integration
- MSW for API mocking during development and testing
- Browser worker for web platform
- Comprehensive fixtures for all features
- Enabled via `EXPO_PUBLIC_USE_MOCKS=true`

### 4. Design System
- Token-based design system (colors, typography, spacing)
- Reusable UI components (Button, Card, Screen, Text, SegmentedControl)
- Theme provider for consistent styling
- Safe area context for proper platform margins

### 5. State Management Strategy
- **React Query**: Server state and API caching
- **Zustand**: Client-side state management
- **React Context**: App-wide providers (theme, toast, share intent)
- Query lifecycle provider for background sync

### 6. Testing Strategy
- **Unit/Integration**: Jest with React Native Testing Library
- **E2E**: Custom E2E test suite with MSW
- **Mocked Tests**: Complete workflow testing without backend
- **Live Backend Tests**: Script-based E2E verification

### 7. Feature Organization
- Feature-based folder structure under `src/features/`
- Each feature contained components, hooks, and types
- Co-located feature-specific logic
- Clean separation of concerns

### 8. Cross-Platform Support
- Single codebase for iOS, Android, and Web
- Platform-specific code paths when necessary
- React Native Web for web compatibility
- Custom webpack configuration for web builds

### 9. Development Experience
- Hot module replacement for fast iteration
- TypeScript strict mode for type safety
- ESLint + Prettier for code quality
- Comprehensive npm scripts for common tasks

### 10. Import & Intelligence Features
- GiftedChat-based AI interaction UI
- Card draft preview and selection
- Bulk import with LLM-powered clustering
- Direction-scoped card creation

## Environment Variables

- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL (default: `http://localhost:3000`)
- `EXPO_PUBLIC_USE_MOCKS`: Enable MSW mocking (`true`/`false`)
- `WEB_PORT`: Web development server port (default: `8081`)
- `EXPO_ROUTER_APP_ROOT`: Router root directory
- `EXPO_ROUTER_IMPORT_MODE`: Import mode (`sync`/`async`)

## Backend Integration

The frontend integrated with a Rust-based Axum backend providing:

- Direction management (CRUD operations)
- Skill point management
- Memory card management
- Tree snapshot API
- Intelligence/AI card drafts
- Import preview and onboarding bootstrap
- Settings export

API endpoints were fully typed and integrated with React Query for caching and optimistic updates.

## Docker Support

The frontend included a Dockerfile for containerized deployment:
- Multi-stage build process
- Static web build served via nginx
- Production-optimized bundle
- Environment variable injection at runtime

## Migration Context

This Expo-based architecture was replaced to simplify the frontend stack and focus on web-first development. The migration involved:

- Moving from React Native to standard React web components
- Replacing Expo Router with a simpler routing solution
- Removing mobile-specific dependencies (Reanimated, Gesture Handler, etc.)
- Simplifying the build process (removing Expo/webpack complexity)
- Maintaining API integration and state management patterns

## Reference Materials

For understanding the product and technical design that informed this architecture:
- See `知进（know_flow）_产品_技术设计_v_0.md` in repository root
- Backend API documentation in `backend/services/api/`
- Recent git commits showing the evolution of features

## Dependencies Snapshot (package.json)

**Production Dependencies:**
```json
{
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/native-stack": "^7.0.0",
  "@tanstack/react-query": "^5.62.7",
  "expo": "~54.0.13",
  "expo-linking": "^8.0.8",
  "expo-router": "^6.0.12",
  "expo-status-bar": "~3.0.8",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "react-native": "0.81.4",
  "react-native-gesture-handler": "^2.19.0",
  "react-native-gifted-chat": "^2.5.0",
  "react-native-reanimated": "^4.1.3",
  "react-native-safe-area-context": "^5.4.1",
  "react-native-screens": "^4.6.0",
  "react-native-web": "0.21.1",
  "react-native-worklets": "^0.6.1",
  "react-native-worklets-core": "^1.6.2",
  "zustand": "^5.0.0"
}
```

**Development Dependencies:**
```json
{
  "@eslint/eslintrc": "^3.3.1",
  "@eslint/js": "^9.37.0",
  "@expo/webpack-config": "^19.0.1",
  "@pmmmwh/react-refresh-webpack-plugin": "^0.6.1",
  "@testing-library/jest-native": "^5.4.3",
  "@testing-library/react-native": "^12.6.2",
  "@types/jest": "^29.5.12",
  "@types/node": "^24.7.2",
  "@types/react": "~19.1.0",
  "@types/react-native": "^0.72.8",
  "@typescript-eslint/eslint-plugin": "^8.17.0",
  "@typescript-eslint/parser": "^8.17.0",
  "babel-plugin-module-resolver": "^5.0.2",
  "babel-preset-expo": "~54.0.0",
  "copy-webpack-plugin": "^13.0.1",
  "es-abstract": "^1.23.3",
  "eslint": "^8.57.1",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-react": "^7.37.2",
  "eslint-plugin-react-hooks": "^5.1.0",
  "eslint-plugin-react-native": "^5.0.0",
  "jest": "^29.7.0",
  "jest-expo": "^49.0.0",
  "msw": "^2.4.10",
  "prettier": "^3.3.3",
  "react-test-renderer": "19.1.0",
  "typescript": "^5.6.3",
  "whatwg-fetch": "^3.6.20"
}
```

---

**End of Archived Documentation**

This document serves as a comprehensive reference for the original Expo-based frontend architecture. For current implementation details, refer to the active frontend directory and updated README.
