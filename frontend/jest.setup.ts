import 'whatwg-fetch';
import '@testing-library/jest-native/extend-expect';
import { act } from '@testing-library/react-native';

import { mockTodayWorkout, mockWorkoutSummary } from './src/mocks/fixtures/todayWorkout';
import { mockProgressSnapshot } from './src/mocks/fixtures/progress';
import { mockSearchResponse } from './src/mocks/fixtures/search';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

type GlobalWithFetch = typeof globalThis & { fetch?: typeof fetch };

const globalWithFetch = global as GlobalWithFetch;

const buildResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

beforeEach(() => {
  jest.useFakeTimers();
  if (!globalWithFetch.fetch) {
    globalWithFetch.fetch = fetch;
  }
  jest.spyOn(globalWithFetch, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.endsWith('/api/today')) {
      return buildResponse({ workout: mockTodayWorkout });
    }

    if (url.includes('/api/workouts/') && url.endsWith('/done')) {
      return buildResponse({ summary: mockWorkoutSummary });
    }

    if (url.endsWith('/api/progress')) {
      return buildResponse(mockProgressSnapshot);
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
