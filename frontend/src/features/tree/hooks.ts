import { useQuery } from '@tanstack/react-query';

import { fetchTreeSnapshot, type TreeSnapshot } from '@api';

export const TREE_SNAPSHOT_QUERY_KEY = ['tree-snapshot'] as const;

export const useTreeSnapshot = () =>
  useQuery<TreeSnapshot>({
    queryKey: TREE_SNAPSHOT_QUERY_KEY,
    queryFn: fetchTreeSnapshot,
  });
