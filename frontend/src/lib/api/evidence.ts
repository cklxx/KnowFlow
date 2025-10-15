import { apiFetch } from './client';
import type { Evidence, NewEvidenceInput } from './types';

export const listEvidence = (cardId: string) =>
  apiFetch<Evidence[]>(`/api/cards/${cardId}/evidence`);

export const createEvidence = (cardId: string, payload: NewEvidenceInput) =>
  apiFetch<Evidence>(`/api/cards/${cardId}/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      source_type: payload.source_type,
      source_uri: payload.source_uri ?? null,
      excerpt: payload.excerpt ?? null,
      credibility: payload.credibility ?? null,
    }),
  });

export const removeEvidence = (id: string) =>
  apiFetch<void>(`/api/evidence/${id}`, {
    method: 'DELETE',
  });
