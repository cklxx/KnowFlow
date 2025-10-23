import { apiFetch } from './client';
import type {
  CardApplication,
  CardType,
  MemoryCard,
  NewCardApplicationInput,
} from './types';

export type CardSearchParams = {
  directionId?: string;
  skillPointId?: string;
  q?: string;
  dueBefore?: string;
  limit?: number;
};

export const searchCards = (params: CardSearchParams) =>
  apiFetch<MemoryCard[]>('/api/cards', {
    params: {
      direction_id: params.directionId,
      skill_point_id: params.skillPointId,
      q: params.q,
      due_before: params.dueBefore,
      limit: params.limit?.toString(),
    },
  });

export const getCard = (id: string) => apiFetch<MemoryCard>(`/api/cards/${id}`);

export type UpdateCardPayload = {
  skill_point_id?: string | null;
  title?: string;
  body?: string;
  card_type?: CardType;
  stability?: number;
  relevance?: number;
  novelty?: number;
  priority?: number;
  next_due?: string | null;
};

export const updateCard = (id: string, payload: UpdateCardPayload) => {
  const body: Record<string, unknown> = {};

  if ('skill_point_id' in payload) {
    body.skill_point_id = payload.skill_point_id;
  }
  if ('title' in payload) {
    body.title = payload.title;
  }
  if ('body' in payload) {
    body.body = payload.body;
  }
  if ('card_type' in payload) {
    body.card_type = payload.card_type;
  }
  if ('stability' in payload) {
    body.stability = payload.stability;
  }
  if ('relevance' in payload) {
    body.relevance = payload.relevance;
  }
  if ('novelty' in payload) {
    body.novelty = payload.novelty;
  }
  if ('priority' in payload) {
    body.priority = payload.priority;
  }
  if ('next_due' in payload) {
    body.next_due = payload.next_due ?? null;
  }

  return apiFetch<MemoryCard>(`/api/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

export const deleteCard = (id: string) =>
  apiFetch<void>(`/api/cards/${id}`, {
    method: 'DELETE',
  });

export const listCardApplications = (cardId: string) =>
  apiFetch<CardApplication[]>(`/api/cards/${cardId}/applications`);

export const createCardApplication = (
  cardId: string,
  payload: NewCardApplicationInput,
) => {
  const body: Record<string, unknown> = {
    context: payload.context,
  };

  if (payload.noted_at) {
    body.noted_at = payload.noted_at;
  }

  return apiFetch<CardApplication>(`/api/cards/${cardId}/applications`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};
