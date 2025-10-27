import { apiClient } from './client';
import type { SearchRequest, SearchResult } from '../types/api';

/**
 * Search API endpoints
 */
export const searchApi = {
  /**
   * Search for cards
   */
  search: async (params: SearchRequest): Promise<SearchResult> => {
    const response = await apiClient.get<SearchResult>('/search', {
      params: {
        query: params.query,
        direction_id: params.direction_id,
        limit: params.limit || 20,
      },
    });
    return response.data;
  },
};
