import 'whatwg-fetch';
import '@testing-library/jest-native/extend-expect';
import { act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { mockTodayWorkout, mockWorkoutSummary } from './src/mocks/fixtures/todayWorkout';
import { mockProgressSnapshot } from './src/mocks/fixtures/progress';
import { mockSearchResponse, mockSearchSuggestions } from './src/mocks/fixtures/search';
import {
  buildTreeSnapshot,
  bootstrapOnboardingData,
  createEvidenceRecord,
  createDirectionRecord,
  createMemoryCardRecord,
  createCardApplicationRecord,
  createSkillPointRecord,
  deleteDirectionRecord,
  deleteEvidenceRecord,
  deleteMemoryCardRecord,
  deleteSkillPointRecord,
  getMemoryCardRecord,
  listCardsForDirection,
  listCardApplications,
  listDirections,
  listSkillPointsForDirection,
  resetMockDirectionData,
  listEvidenceForCard,
  updateDirectionRecord,
  updateMemoryCardRecord,
  updateSkillPointRecord,
  buildSyncDelta,
} from './src/mocks/fixtures/directions';
import { buildVaultSnapshot } from './src/mocks/fixtures/vault';
import { buildImportPreview } from './src/mocks/fixtures/import';
import { generateMockCardDrafts } from './src/mocks/fixtures/intelligence';
import {
  buildSettingsExport,
  buildSettingsSummary,
  getNotificationPreferences,
  updateNotificationPreferencesRecord,
} from './src/mocks/fixtures/settings';

const linkingListeners: Array<(event: { url: string }) => void> = [];

jest.mock('expo-linking', () => ({
  addEventListener: (_type: 'url', listener: (event: { url: string }) => void) => {
    linkingListeners.push(listener);
    return {
      remove: () => {
        const index = linkingListeners.indexOf(listener);
        if (index >= 0) {
          linkingListeners.splice(index, 1);
        }
      },
    };
  },
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  openURL: jest.fn(),
  createURL: jest.fn(),
}));

(globalThis as unknown as { __emitLinkingEvent?: (url: string) => void }).__emitLinkingEvent = (
  url: string,
) => {
  linkingListeners.slice().forEach((listener) => listener({ url }));
};

type LocalSearchParams = Record<string, string | string[]>;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const routerState: { params: LocalSearchParams } = { params: {} };

(globalThis as unknown as { __setMockRouterParams?: (params: LocalSearchParams) => void }).__setMockRouterParams = (
  params: LocalSearchParams,
) => {
  routerState.params = params;
};

(globalThis as unknown as { __getMockRouter?: () => typeof mockRouter }).__getMockRouter = () => mockRouter;

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => routerState.params,
  router: mockRouter,
}));

jest.mock('react-native-gifted-chat', () => {
  const append = (current: unknown[] = [], messages: unknown[] = []) => [
    ...messages,
    ...current,
  ];

  const GiftedChat = Object.assign(
    () => null,
    { append },
  );

  const createStub = () => null;

  return {
    GiftedChat,
    Bubble: createStub,
    InputToolbar: createStub,
    Send: createStub,
  };
});

const appStateListeners: Array<(status: string) => void> = [];
ReactNative.AppState = {
  ...(ReactNative.AppState ?? {}),
  currentState: 'active',
  addEventListener: (_type: string, listener: (status: string) => void) => {
    appStateListeners.push(listener);
    return {
      remove: () => {
        const index = appStateListeners.indexOf(listener);
        if (index >= 0) {
          appStateListeners.splice(index, 1);
        }
      },
    };
  },
};

(globalThis as unknown as { __emitAppState?: (status: string) => void }).__emitAppState = (
  status: string,
) => {
  appStateListeners.slice().forEach((listener) => listener(status));
};

type GlobalWithFetch = typeof globalThis & { fetch?: typeof fetch };

const globalWithFetch = global as GlobalWithFetch;

const liveApiFlag = (process.env.E2E_USE_LIVE_API ?? '').toLowerCase();
const shouldMockApi = !(liveApiFlag === '1' || liveApiFlag === 'true');

const buildResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  routerState.params = {};
  resetMockDirectionData();
  if (!globalWithFetch.fetch) {
    globalWithFetch.fetch = fetch;
  }
  if (!shouldMockApi) {
    return;
  }
  jest.spyOn(globalWithFetch, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? 'GET';

    const urlObject = new URL(url);
    const { pathname } = urlObject;

    if (url.endsWith('/api/today')) {
      return buildResponse({ workout: mockTodayWorkout });
    }

    if (url.includes('/api/workouts/') && url.endsWith('/done')) {
      return buildResponse({ summary: mockWorkoutSummary });
    }

    if (url.endsWith('/api/progress')) {
      return buildResponse(mockProgressSnapshot);
    }

    if (pathname === '/api/sync') {
      const since = urlObject.searchParams.get('since');
      return buildResponse(buildSyncDelta(since));
    }

    if (pathname === '/api/import/preview' && method === 'POST') {
      const payload = JSON.parse((init?.body as string) ?? '{}');
      return buildResponse(buildImportPreview(payload));
    }

    if (pathname === '/api/intelligence/card-drafts' && method === 'POST') {
      const payload = JSON.parse((init?.body as string) ?? '{}');
      return buildResponse({ drafts: generateMockCardDrafts(payload) });
    }

    if (pathname === '/api/onboarding/bootstrap' && method === 'POST') {
      const payload = JSON.parse((init?.body as string) ?? '{}');
      return buildResponse(bootstrapOnboardingData(payload));
    }

    if (url.endsWith('/api/settings/summary')) {
      return buildResponse(buildSettingsSummary());
    }

    if (url.endsWith('/api/settings/export')) {
      return buildResponse(buildSettingsExport());
    }

    if (url.endsWith('/api/settings/notifications')) {
      if (method === 'GET') {
        return buildResponse(getNotificationPreferences());
      }
      if (method === 'PATCH') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        try {
          const updated = updateNotificationPreferencesRecord(payload);
          return buildResponse(updated);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid notification payload';
          return new Response(message, { status: 422 });
        }
      }
    }

    if (pathname === '/api/search/suggestions') {
      return buildResponse(mockSearchSuggestions);
    }

    if (url.includes('/api/search')) {
      const searchParams = new URL(url).searchParams;
      if (!searchParams.get('q')) {
        return buildResponse({
          query: '',
          cards: [],
          evidence: [],
          evergreen: [],
          applications: [],
          directions: [],
        });
      }
      return buildResponse(mockSearchResponse);
    }

    if (pathname === '/api/directions') {
      if (method === 'POST') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const created = createDirectionRecord(payload);
        return buildResponse(created, { status: 201 });
      }
      return buildResponse(listDirections());
    }

    const directionMatch = pathname.match(/^\/api\/directions\/([^/]+)$/);
    if (directionMatch) {
      const [, directionId] = directionMatch;
      if (method === 'PATCH') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const updated = updateDirectionRecord(directionId, payload);
        if (!updated) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(updated);
      }
      if (method === 'DELETE') {
        const removed = deleteDirectionRecord(directionId);
        return removed ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
      }
    }

    const skillPointsMatch = pathname.match(/^\/api\/directions\/([^/]+)\/skill-points$/);
    if (skillPointsMatch) {
      const [, directionId] = skillPointsMatch;
      if (method === 'POST') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const created = createSkillPointRecord(directionId, payload);
        if (!created) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(created, { status: 201 });
      }
      return buildResponse(listSkillPointsForDirection(directionId));
    }

    const skillPointMatch = pathname.match(/^\/api\/skill-points\/([^/]+)$/);
    if (skillPointMatch) {
      const [, skillPointId] = skillPointMatch;
      if (method === 'PATCH') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const updated = updateSkillPointRecord(skillPointId, payload);
        if (!updated) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(updated);
      }
      if (method === 'DELETE') {
        const removed = deleteSkillPointRecord(skillPointId);
        return removed ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
      }
    }

    const directionCardsMatch = pathname.match(/^\/api\/directions\/([^/]+)\/cards$/);
    if (directionCardsMatch) {
      const [, directionId] = directionCardsMatch;
      if (method === 'POST') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const created = createMemoryCardRecord(directionId, payload);
        if (!created) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(created, { status: 201 });
      }
      const skillPointParam = urlObject.searchParams.get('skill_point_id');
      const filter = skillPointParam && skillPointParam.length ? skillPointParam : undefined;
      return buildResponse(listCardsForDirection(directionId, filter));
    }

    const cardMatch = pathname.match(/^\/api\/cards\/([^/]+)$/);
    if (cardMatch) {
      const [, cardId] = cardMatch;
      if (method === 'GET') {
        const card = getMemoryCardRecord(cardId);
        if (!card) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(card);
      }
      if (method === 'PATCH') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const updated = updateMemoryCardRecord(cardId, payload);
        if (!updated) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(updated);
      }
      if (method === 'DELETE') {
        const removed = deleteMemoryCardRecord(cardId);
        return removed ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
      }
    }

    const cardEvidenceMatch = pathname.match(/^\/api\/cards\/([^/]+)\/evidence$/);
    if (cardEvidenceMatch) {
      const [, cardId] = cardEvidenceMatch;
      if (method === 'GET') {
        const card = getMemoryCardRecord(cardId);
        if (!card) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(listEvidenceForCard(cardId));
      }
      if (method === 'POST') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        const created = createEvidenceRecord(cardId, payload);
        if (!created) {
          return new Response('Not found', { status: 404 });
        }
        return buildResponse(created, { status: 201 });
      }
    }

    const cardApplicationsMatch = pathname.match(/^\/api\/cards\/([^/]+)\/applications$/);
    if (cardApplicationsMatch) {
      const [, cardId] = cardApplicationsMatch;
      const card = getMemoryCardRecord(cardId);
      if (!card) {
        return new Response('Not found', { status: 404 });
      }
      if (method === 'GET') {
        return buildResponse(listCardApplications(cardId));
      }
      if (method === 'POST') {
        const payload = JSON.parse((init?.body as string) ?? '{}');
        try {
          const created = createCardApplicationRecord(cardId, payload);
          if (!created) {
            return new Response('Not found', { status: 404 });
          }
          return buildResponse(created, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid application payload';
          return new Response(message, { status: 422 });
        }
      }
    }

    const evidenceMatch = pathname.match(/^\/api\/evidence\/([^/]+)$/);
    if (evidenceMatch) {
      const [, evidenceId] = evidenceMatch;
      if (method === 'DELETE') {
        const removed = deleteEvidenceRecord(evidenceId);
        return removed ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
      }
    }

    if (pathname === '/api/tree') {
      return buildResponse(buildTreeSnapshot());
    }

    if (pathname === '/api/vault') {
      return buildResponse(buildVaultSnapshot());
    }

    console.warn('Unhandled fetch in test:', url, init);
    return new Response(null, { status: 404 });
  });
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});
