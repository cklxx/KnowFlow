import { apiClient } from './client';
import type { ProgressResponse } from '../types/api';

/**
 * Progress API endpoints
 */
export const progressApi = {
  /**
   * Get progress statistics
   */
  getStats: async (): Promise<ProgressResponse> => {
    const response = await apiClient.get<ProgressResponse>('/progress');
    return response.data;
  },
};
