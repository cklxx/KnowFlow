import { apiFetch } from './client';
import type { SettingsExport, SettingsSummary } from './types';

export const fetchSettingsSummary = () =>
  apiFetch<SettingsSummary>('/api/settings/summary');

export const fetchSettingsExport = () =>
  apiFetch<SettingsExport>('/api/settings/export');

