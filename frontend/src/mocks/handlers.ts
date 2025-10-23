import { http, HttpResponse } from 'msw';

import type {
  CreateDirectionPayload,
  CreateMemoryCardPayload,
  CreateSkillPointPayload,
  ImportPreviewParams,
  NewCardApplicationInput,
  NewEvidenceInput,
  UpdateDirectionPayload,
  UpdateMemoryCardPayload,
  UpdateSkillPointPayload,
  UpdateNotificationPreferencesPayload,
} from '@api';

import { mockTodayWorkout, mockWorkoutSummary } from './fixtures/todayWorkout';
import { mockProgressSnapshot } from './fixtures/progress';
import { mockSearchResponse, mockSearchSuggestions } from './fixtures/search';
import { buildImportPreview } from './fixtures/import';
import { generateMockCardDrafts } from './fixtures/intelligence';
import { buildSettingsExport, buildSettingsSummary } from './fixtures/settings';
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
  listEvidenceForCard,
  buildSyncDelta,
  updateDirectionRecord,
  updateMemoryCardRecord,
  updateSkillPointRecord,
} from './fixtures/directions';
import { buildVaultSnapshot } from './fixtures/vault';
import {
  getNotificationPreferences,
  updateNotificationPreferencesRecord,
} from './fixtures/settings';

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
  http.get(`${API_BASE}/api/directions`, () => HttpResponse.json(listDirections())),
  http.get(`${API_BASE}/api/sync`, ({ request }) => {
    const url = new URL(request.url);
    const since = url.searchParams.get('since');
    return HttpResponse.json(buildSyncDelta(since));
  }),
  http.post(`${API_BASE}/api/directions`, async ({ request }) => {
    const payload = (await request.json()) as CreateDirectionPayload;
    const created = createDirectionRecord(payload);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${API_BASE}/api/directions/:directionId`, async ({ params, request }) => {
    const { directionId } = params as { directionId: string };
    const payload = (await request.json()) as UpdateDirectionPayload;
    const updated = updateDirectionRecord(directionId, payload);
    if (!updated) {
      return new HttpResponse('Direction not found', { status: 404 });
    }
    return HttpResponse.json(updated);
  }),
  http.delete(`${API_BASE}/api/directions/:directionId`, ({ params }) => {
    const { directionId } = params as { directionId: string };
    const removed = deleteDirectionRecord(directionId);
    return removed ? new HttpResponse(null, { status: 204 }) : new HttpResponse('Direction not found', { status: 404 });
  }),
  http.get(`${API_BASE}/api/directions/:directionId/skill-points`, ({ params }) => {
    const { directionId } = params as { directionId: string };
    return HttpResponse.json(listSkillPointsForDirection(directionId));
  }),
  http.post(`${API_BASE}/api/directions/:directionId/skill-points`, async ({ params, request }) => {
    const { directionId } = params as { directionId: string };
    const payload = (await request.json()) as CreateSkillPointPayload;
    const created = createSkillPointRecord(directionId, payload);
    if (!created) {
      return new HttpResponse('Direction not found', { status: 404 });
    }
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${API_BASE}/api/skill-points/:skillPointId`, async ({ params, request }) => {
    const { skillPointId } = params as { skillPointId: string };
    const payload = (await request.json()) as UpdateSkillPointPayload;
    const updated = updateSkillPointRecord(skillPointId, payload);
    if (!updated) {
      return new HttpResponse('Skill point not found', { status: 404 });
    }
    return HttpResponse.json(updated);
  }),
  http.delete(`${API_BASE}/api/skill-points/:skillPointId`, ({ params }) => {
    const { skillPointId } = params as { skillPointId: string };
    const removed = deleteSkillPointRecord(skillPointId);
    return removed ? new HttpResponse(null, { status: 204 }) : new HttpResponse('Skill point not found', { status: 404 });
  }),
  http.get(`${API_BASE}/api/directions/:directionId/cards`, ({ params, request }) => {
    const { directionId } = params as { directionId: string };
    const url = new URL(request.url);
    const skillPointId = url.searchParams.get('skill_point_id');
    return HttpResponse.json(
      listCardsForDirection(directionId, skillPointId && skillPointId.length ? skillPointId : undefined),
    );
  }),
  http.post(`${API_BASE}/api/directions/:directionId/cards`, async ({ params, request }) => {
    const { directionId } = params as { directionId: string };
    const payload = (await request.json()) as CreateMemoryCardPayload;
    try {
      const created = createMemoryCardRecord(directionId, payload);
      if (!created) {
        return new HttpResponse('Direction not found', { status: 404 });
      }
      return HttpResponse.json(created, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid memory card payload';
      return new HttpResponse(message, { status: 422 });
    }
  }),
  http.get(`${API_BASE}/api/cards/:cardId`, ({ params }) => {
    const { cardId } = params as { cardId: string };
    const card = getMemoryCardRecord(cardId);
    if (!card) {
      return new HttpResponse('Card not found', { status: 404 });
    }
    return HttpResponse.json(card);
  }),
  http.patch(`${API_BASE}/api/cards/:cardId`, async ({ params, request }) => {
    const { cardId } = params as { cardId: string };
    const payload = (await request.json()) as UpdateMemoryCardPayload;
    try {
      const updated = updateMemoryCardRecord(cardId, payload);
      if (!updated) {
        return new HttpResponse('Card not found', { status: 404 });
      }
      return HttpResponse.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid memory card payload';
      return new HttpResponse(message, { status: 422 });
    }
  }),
  http.delete(`${API_BASE}/api/cards/:cardId`, ({ params }) => {
    const { cardId } = params as { cardId: string };
    const removed = deleteMemoryCardRecord(cardId);
    return removed ? new HttpResponse(null, { status: 204 }) : new HttpResponse('Card not found', { status: 404 });
  }),
  http.get(`${API_BASE}/api/cards/:cardId/evidence`, ({ params }) => {
    const { cardId } = params as { cardId: string };
    const card = getMemoryCardRecord(cardId);
    if (!card) {
      return new HttpResponse('Card not found', { status: 404 });
    }
    return HttpResponse.json(listEvidenceForCard(cardId));
  }),
  http.post(`${API_BASE}/api/cards/:cardId/evidence`, async ({ params, request }) => {
    const { cardId } = params as { cardId: string };
    const payload = (await request.json()) as NewEvidenceInput;
    const created = createEvidenceRecord(cardId, payload);
    if (!created) {
      return new HttpResponse('Card not found', { status: 404 });
    }
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(`${API_BASE}/api/cards/:cardId/applications`, ({ params }) => {
    const { cardId } = params as { cardId: string };
    const card = getMemoryCardRecord(cardId);
    if (!card) {
      return new HttpResponse('Card not found', { status: 404 });
    }
    return HttpResponse.json(listCardApplications(cardId));
  }),
  http.post(`${API_BASE}/api/cards/:cardId/applications`, async ({ params, request }) => {
    const { cardId } = params as { cardId: string };
    const card = getMemoryCardRecord(cardId);
    if (!card) {
      return new HttpResponse('Card not found', { status: 404 });
    }
    const payload = (await request.json()) as NewCardApplicationInput;
    try {
      const created = createCardApplicationRecord(cardId, payload);
      if (!created) {
        return new HttpResponse('Card not found', { status: 404 });
      }
      return HttpResponse.json(created, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid application payload';
      return new HttpResponse(message, { status: 422 });
    }
  }),
  http.delete(`${API_BASE}/api/evidence/:evidenceId`, ({ params }) => {
    const { evidenceId } = params as { evidenceId: string };
    const removed = deleteEvidenceRecord(evidenceId);
    return removed
      ? new HttpResponse(null, { status: 204 })
      : new HttpResponse('Evidence not found', { status: 404 });
  }),
  http.get(`${API_BASE}/api/today`, () => HttpResponse.json({ workout: mockTodayWorkout })),
  http.post(`${API_BASE}/api/workouts/:workoutId/done`, async () =>
    HttpResponse.json({ summary: mockWorkoutSummary }),
  ),
  http.post(`${API_BASE}/api/import/preview`, async ({ request }) => {
    const payload = (await request.json()) as ImportPreviewParams;
    return HttpResponse.json(buildImportPreview(payload));
  }),
  http.post(`${API_BASE}/api/intelligence/card-drafts`, async ({ request }) => {
    const payload = (await request.json()) as Parameters<typeof generateMockCardDrafts>[0];
    return HttpResponse.json({ drafts: generateMockCardDrafts(payload) });
  }),
  http.post(`${API_BASE}/api/onboarding/bootstrap`, async ({ request }) => {
    const payload = (await request.json()) as Parameters<typeof bootstrapOnboardingData>[0];
    return HttpResponse.json(bootstrapOnboardingData(payload));
  }),
  http.get(`${API_BASE}/api/progress`, () => HttpResponse.json(mockProgressSnapshot)),
  http.get(`${API_BASE}/api/settings/summary`, () => HttpResponse.json(buildSettingsSummary())),
  http.get(`${API_BASE}/api/settings/export`, () => HttpResponse.json(buildSettingsExport())),
  http.get(`${API_BASE}/api/settings/notifications`, () =>
    HttpResponse.json(getNotificationPreferences()),
  ),
  http.patch(`${API_BASE}/api/settings/notifications`, async ({ request }) => {
    const payload = (await request.json()) as UpdateNotificationPreferencesPayload;
    try {
      const updated = updateNotificationPreferencesRecord(payload);
      return HttpResponse.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid notification payload';
      return new HttpResponse(message, { status: 422 });
    }
  }),
  http.get(`${API_BASE}/api/search`, searchHandler),
  http.get(`${API_BASE}/api/search/suggestions`, () => HttpResponse.json(mockSearchSuggestions)),
  http.get(`${API_BASE}/api/tree`, () => HttpResponse.json(buildTreeSnapshot())),
  http.get(`${API_BASE}/api/vault`, () => HttpResponse.json(buildVaultSnapshot())),
];
