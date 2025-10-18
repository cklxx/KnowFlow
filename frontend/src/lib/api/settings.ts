import { apiFetch } from './client';
import type {
  NotificationPreferences,
  SettingsExport,
  SettingsSummary,
} from './types';

export const fetchSettingsSummary = () =>
  apiFetch<SettingsSummary>('/api/settings/summary');

export const fetchSettingsExport = () =>
  apiFetch<SettingsExport>('/api/settings/export');

export const fetchNotificationPreferences = () =>
  apiFetch<NotificationPreferences>('/api/settings/notifications');

export const updateNotificationPreferences = (
  payload: Omit<NotificationPreferences, 'updated_at'>,
) =>
  apiFetch<NotificationPreferences>('/api/settings/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
