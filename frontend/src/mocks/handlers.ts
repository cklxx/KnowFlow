import { http, HttpResponse } from 'msw';

import { mockTodayWorkout, mockWorkoutSummary } from './fixtures/todayWorkout';
import { mockProgressSnapshot } from './fixtures/progress';
import { mockSearchResponse } from './fixtures/search';

const searchHandler = (({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  if (!query) {
    return HttpResponse.json({
      query: '',
      cards: [],
      evidence: [],
      evergreen: [],
      applications: [],
      directions: [],
    });
  }
  return HttpResponse.json(mockSearchResponse);
}) as Parameters<typeof http.get>[1];

const API_BASE = 'http://localhost:3000';

export const handlers = [
  http.get(`${API_BASE}/api/today`, () => HttpResponse.json({ workout: mockTodayWorkout })),
  http.post(`${API_BASE}/api/workouts/:workoutId/done`, async () =>
    HttpResponse.json({ summary: mockWorkoutSummary }),
  ),
  http.get(`${API_BASE}/api/progress`, () => HttpResponse.json(mockProgressSnapshot)),
  http.get(`${API_BASE}/api/search`, searchHandler),
];
