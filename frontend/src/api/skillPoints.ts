import { apiClient } from './client';
import type {
  SkillPoint,
  CreateSkillPointRequest,
  UpdateSkillPointRequest,
} from '../types/api';

/**
 * Skill point API endpoints
 */
export const skillPointsApi = {
  /**
   * List skill points for a direction
   */
  listByDirection: async (directionId: string): Promise<SkillPoint[]> => {
    const response = await apiClient.get<SkillPoint[]>(`/directions/${directionId}/skill-points`);
    return response.data;
  },

  /**
   * Create a skill point under a direction
   */
  create: async (directionId: string, data: CreateSkillPointRequest): Promise<SkillPoint> => {
    const response = await apiClient.post<SkillPoint>(`/directions/${directionId}/skill-points`, data);
    return response.data;
  },

  /**
   * Update a skill point
   */
  update: async (skillPointId: string, data: UpdateSkillPointRequest): Promise<SkillPoint> => {
    const response = await apiClient.patch<SkillPoint>(`/skill-points/${skillPointId}`, data);
    return response.data;
  },

  /**
   * Delete a skill point
   */
  delete: async (skillPointId: string): Promise<void> => {
    await apiClient.delete(`/skill-points/${skillPointId}`);
  },
};
