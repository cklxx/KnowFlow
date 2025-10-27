import { apiClient } from './client';
import type { TreeSnapshot } from '../types/api';

/**
 * Tree/Skill Point API endpoints
 */
export const treeApi = {
  /**
   * Get tree snapshot for a direction
   */
  getSnapshot: async (directionId: string): Promise<TreeSnapshot> => {
    const response = await apiClient.get<TreeSnapshot>(`/tree/${directionId}`);
    return response.data;
  },

  /**
   * Get all tree snapshots
   */
  getAllSnapshots: async (): Promise<TreeSnapshot[]> => {
    const response = await apiClient.get<TreeSnapshot[]>('/tree');
    return response.data;
  },
};
