import { apiClient } from './client';
import type { IntelligenceRequest, IntelligenceResponse } from '../types/api';

/**
 * Intelligence/AI API endpoints
 */
export const intelligenceApi = {
  /**
   * Send a message to the AI assistant and get card drafts
   */
  chat: async (data: IntelligenceRequest): Promise<IntelligenceResponse> => {
    const response = await apiClient.post<IntelligenceResponse>('/intelligence/chat', data);
    return response.data;
  },

  /**
   * Generate card suggestions based on a topic
   */
  generateCards: async (directionId: string, topic: string): Promise<IntelligenceResponse> => {
    const response = await apiClient.post<IntelligenceResponse>('/intelligence/generate', {
      direction_id: directionId,
      topic,
    });
    return response.data;
  },
};
