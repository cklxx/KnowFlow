import { useQuery } from '@tanstack/react-query';

import { fetchProgressSnapshot, type ProgressSnapshot } from '@api';

const PROGRESS_KEY = ['progress-snapshot'];

export const useProgressSnapshot = () =>
  useQuery<ProgressSnapshot>({
    queryKey: PROGRESS_KEY,
    queryFn: fetchProgressSnapshot,
    staleTime: 1000 * 60,
  });
