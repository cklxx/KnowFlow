import { useMutation, useQuery } from '@tanstack/react-query';

import {
  fetchSettingsExport,
  fetchSettingsSummary,
  type SettingsExport,
  type SettingsSummary,
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
