import { apiClient } from './client';
import type { TreeSnapshot } from '../types/api';

/**
 * Tree/Skill Point API endpoints
 */
export const treeApi = {
  /**
   * Get the latest tree snapshot across all directions
   */
  getSnapshot: async (): Promise<TreeSnapshot> => {
    const response = await apiClient.get<TreeSnapshot>('/tree');
    return response.data;
  },
};
