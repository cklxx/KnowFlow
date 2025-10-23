import { apiFetch } from './client';
import type {
  NotificationPreferences,
  SettingsExport,
  SettingsSummary,
  UpdateNotificationPreferencesPayload,
} from './types';

export const fetchSettingsSummary = () =>
  apiFetch<SettingsSummary>('/api/settings/summary');

export const fetchSettingsExport = () =>
  apiFetch<SettingsExport>('/api/settings/export');

export const fetchNotificationPreferences = () =>
  apiFetch<NotificationPreferences>('/api/settings/notifications');

export const updateNotificationPreferences = (
  payload: UpdateNotificationPreferencesPayload,
) => {
  const body: Record<string, unknown> = {};

  if (payload.daily_reminder_enabled !== undefined) {
    body.daily_reminder_enabled = payload.daily_reminder_enabled;
  }
  if (payload.daily_reminder_time !== undefined) {
    body.daily_reminder_time = payload.daily_reminder_time;
  }
  if (payload.daily_reminder_target !== undefined) {
    body.daily_reminder_target = payload.daily_reminder_target;
  }
  if (payload.due_reminder_enabled !== undefined) {
    body.due_reminder_enabled = payload.due_reminder_enabled;
  }
  if (payload.due_reminder_time !== undefined) {
    body.due_reminder_time = payload.due_reminder_time;
  }
  if (payload.due_reminder_target !== undefined) {
    body.due_reminder_target = payload.due_reminder_target;
  }
  if (payload.remind_before_due_minutes !== undefined) {
    body.remind_before_due_minutes = payload.remind_before_due_minutes;
  }

  return apiFetch<NotificationPreferences>('/api/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

