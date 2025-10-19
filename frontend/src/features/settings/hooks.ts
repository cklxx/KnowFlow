import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchNotificationPreferences,
  fetchSettingsExport,
  fetchSettingsSummary,
  updateNotificationPreferences,
  type NotificationPreferences,
  type SettingsExport,
  type SettingsSummary,
} from '@api';

const SETTINGS_SUMMARY_KEY = ['settings-summary'];
const NOTIFICATION_PREFS_KEY = ['settings-notifications'];

export const useSettingsSummary = () =>
  useQuery<SettingsSummary>({
    queryKey: SETTINGS_SUMMARY_KEY,
    queryFn: fetchSettingsSummary,
    staleTime: 1000 * 60,
  });

export const useSettingsExport = () =>
  useMutation<SettingsExport>({
    mutationFn: fetchSettingsExport,
  });

export const useNotificationPreferences = () =>
  useQuery<NotificationPreferences>({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: fetchNotificationPreferences,
    staleTime: 1000 * 30,
  });

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation<NotificationPreferences, unknown, Omit<NotificationPreferences, 'updated_at'>>({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, data);
    },
  });
};
