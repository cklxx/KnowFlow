import { apiClient } from './client';
import type { NotificationPreferences, SettingsExport } from '../types/api';

/**
 * Settings API endpoints
 */
export const settingsApi = {
  /**
   * Get notification preferences
   */
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/settings/notifications');
    return response.data;
  },

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: async (
    data: NotificationPreferences
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.put<NotificationPreferences>('/settings/notifications', data);
    return response.data;
  },

  /**
   * Export all data
   */
  exportData: async (): Promise<SettingsExport> => {
    const response = await apiClient.get<SettingsExport>('/settings/export');
    return response.data;
  },
};
