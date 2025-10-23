import { apiFetch } from './client';
import type { SyncResponse } from './types';

export const fetchSyncDelta = async (since?: string | null): Promise<SyncResponse> =>
  apiFetch<SyncResponse>('/api/sync', {
    params: since ? { since } : undefined,
  });
