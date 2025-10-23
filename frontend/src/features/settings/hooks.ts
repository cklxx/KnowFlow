import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchNotificationPreferences,
  fetchSettingsExport,
  fetchSettingsSummary,
  updateNotificationPreferences,
  type NotificationPreferences,
  type SettingsExport,
  type SettingsSummary,
  type UpdateNotificationPreferencesPayload,
} from '@api';

const SETTINGS_SUMMARY_KEY = ['settings-summary'];
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

const NOTIFICATION_PREFS_KEY = ['settings-notifications'];

export const useNotificationPreferences = () =>
  useQuery<NotificationPreferences>({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: fetchNotificationPreferences,
    staleTime: 1000 * 60,
  });

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences, Error, UpdateNotificationPreferencesPayload>({
    mutationFn: updateNotificationPreferences,
    onSuccess: (prefs) => {
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, prefs);
    },
  });
};
