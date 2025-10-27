import { apiClient } from './client';
import type { ImportPreviewRequest, ImportPreviewResponse, ImportConfirmRequest } from '../types/api';

/**
 * Import API endpoints
 */
export const importApi = {
  /**
   * Preview import - analyze content and generate card drafts
   */
  preview: async (data: ImportPreviewRequest): Promise<ImportPreviewResponse> => {
    const response = await apiClient.post<ImportPreviewResponse>('/import/preview', data);
    return response.data;
  },

  /**
   * Confirm import - create cards from selected drafts
   */
  confirm: async (data: ImportConfirmRequest): Promise<void> => {
    await apiClient.post('/import/confirm', data);
  },
};
