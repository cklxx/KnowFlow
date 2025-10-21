import { apiFetch } from './client';
import type {
  CreateDirectionPayload,
  Direction,
  SkillPoint,
  MemoryCard,
  CreateSkillPointPayload,
  CreateMemoryCardPayload,
  UpdateDirectionPayload,
  UpdateSkillPointPayload,
  UpdateMemoryCardPayload,
} from './types';

const DIRECTIONS_PATH = '/api/directions';

export const fetchDirections = () => apiFetch<Direction[]>(DIRECTIONS_PATH);

export const createDirection = (payload: CreateDirectionPayload) =>
  apiFetch<Direction>(DIRECTIONS_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateDirection = (id: string, payload: UpdateDirectionPayload) =>
  apiFetch<Direction>(`${DIRECTIONS_PATH}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteDirection = (id: string) =>
  apiFetch<void>(`${DIRECTIONS_PATH}/${id}`, {
    method: 'DELETE',
  });

export const fetchSkillPoints = (directionId: string) =>
  apiFetch<SkillPoint[]>(`${DIRECTIONS_PATH}/${directionId}/skill-points`);

export const createSkillPoint = (directionId: string, payload: CreateSkillPointPayload) =>
  apiFetch<SkillPoint>(`${DIRECTIONS_PATH}/${directionId}/skill-points`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateSkillPoint = (id: string, payload: UpdateSkillPointPayload) =>
  apiFetch<SkillPoint>(`/api/skill-points/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteSkillPoint = (id: string) =>
  apiFetch<void>(`/api/skill-points/${id}`, {
    method: 'DELETE',
  });

export const fetchMemoryCards = (
  directionId: string,
  options?: { skillPointId?: string | null },
) => {
  const skillPointId = options?.skillPointId ?? undefined;
  return apiFetch<MemoryCard[]>(`${DIRECTIONS_PATH}/${directionId}/cards`, {
    params: skillPointId ? { skill_point_id: skillPointId } : undefined,
  });
};

export const createMemoryCard = (directionId: string, payload: CreateMemoryCardPayload) =>
  apiFetch<MemoryCard>(`${DIRECTIONS_PATH}/${directionId}/cards`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateMemoryCard = (id: string, payload: UpdateMemoryCardPayload) =>
  apiFetch<MemoryCard>(`/api/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteMemoryCard = (id: string) =>
  apiFetch<void>(`/api/cards/${id}`, {
    method: 'DELETE',
  });
