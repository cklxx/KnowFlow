import { apiClient } from './client';
import type { MemoryCard, CreateCardRequest, UpdateCardRequest } from '../types/api';

/**
 * Memory Card API endpoints
 */
export const cardsApi = {
  /**
   * Get all cards (optionally filtered by direction)
   */
  getAll: async (directionId?: string): Promise<MemoryCard[]> => {
    const params = directionId ? { direction_id: directionId } : {};
    const response = await apiClient.get<MemoryCard[]>('/cards', { params });
    return response.data;
  },

  /**
   * Get a single card by ID
   */
  getById: async (id: string): Promise<MemoryCard> => {
    const response = await apiClient.get<MemoryCard>(`/cards/${id}`);
    return response.data;
  },

  /**
   * Create a new memory card
   */
  create: async (data: CreateCardRequest): Promise<MemoryCard> => {
    const response = await apiClient.post<MemoryCard>('/cards', data);
    return response.data;
  },

  /**
   * Update an existing card
   */
  update: async (id: string, data: UpdateCardRequest): Promise<MemoryCard> => {
    const response = await apiClient.put<MemoryCard>(`/cards/${id}`, data);
    return response.data;
  },

  /**
   * Delete a card
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/cards/${id}`);
  },
};
