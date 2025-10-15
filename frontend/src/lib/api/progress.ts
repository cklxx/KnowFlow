import { apiFetch } from './client';
import type { ProgressSnapshot } from './types';

export const fetchProgressSnapshot = () =>
  apiFetch<ProgressSnapshot>('/api/progress');
