import { apiClient } from './client';
import type { Direction, CreateDirectionRequest, UpdateDirectionRequest } from '../types/api';

/**
 * Direction API endpoints
 */
export const directionsApi = {
  /**
   * Get all directions
   */
  getAll: async (): Promise<Direction[]> => {
    const response = await apiClient.get<Direction[]>('/directions');
    return response.data;
  },

  /**
   * Get a single direction by ID
   */
  getById: async (id: string): Promise<Direction> => {
    const response = await apiClient.get<Direction>(`/directions/${id}`);
    return response.data;
  },

  /**
   * Create a new direction
   */
  create: async (data: CreateDirectionRequest): Promise<Direction> => {
    const response = await apiClient.post<Direction>('/directions', data);
    return response.data;
  },

  /**
   * Update an existing direction
   */
  update: async (id: string, data: UpdateDirectionRequest): Promise<Direction> => {
    const response = await apiClient.put<Direction>(`/directions/${id}`, data);
    return response.data;
  },

  /**
   * Delete a direction
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/directions/${id}`);
  },
};
