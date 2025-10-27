import { apiClient } from './client';
import type { WorkoutResponse, SubmitReviewRequest } from '../types/api';

/**
 * Today's Workout API endpoints
 */
export const todayApi = {
  /**
   * Get today's workout cards
   */
  getWorkout: async (): Promise<WorkoutResponse> => {
    const response = await apiClient.get<WorkoutResponse>('/today/workout');
    return response.data;
  },

  /**
   * Submit a card review
   */
  submitReview: async (data: SubmitReviewRequest): Promise<void> => {
    await apiClient.post('/today/review', data);
  },
};
