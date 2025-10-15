import { apiFetch } from './client';
import type { VaultSnapshot } from './types';

export const fetchVaultSnapshot = () => apiFetch<VaultSnapshot>('/api/vault');
