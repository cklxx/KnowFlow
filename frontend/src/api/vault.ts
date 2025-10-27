import { apiClient } from './client';
import type { VaultResponse, VaultFilter } from '../types/api';

/**
 * Vault API endpoints
 */
export const vaultApi = {
  /**
   * Get all cards in the vault with filtering and pagination
   */
  getCards: async (filter: VaultFilter = {}): Promise<VaultResponse> => {
    const response = await apiClient.get<VaultResponse>('/vault', {
      params: {
        direction_id: filter.direction_id,
        page: filter.page || 1,
        page_size: filter.page_size || 20,
        sort_by: filter.sort_by || 'created_at',
        sort_order: filter.sort_order || 'desc',
      },
    });
    return response.data;
  },
};
