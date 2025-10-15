import { apiFetch } from './client';
import type { TreeSnapshot } from './types';

export const fetchTreeSnapshot = () =>
  apiFetch<TreeSnapshot>('/api/tree');
