import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { searchCards, type CardSearchParams, type MemoryCard } from '@api';

const DEFAULT_LIMIT = 20;

export const useCardSearch = (params: CardSearchParams) => {
  const normalized = useMemo(
    () => ({
      directionId: params.directionId,
      skillPointId: params.skillPointId,
      q: params.q?.trim() ?? '',
      dueBefore: params.dueBefore,
      limit: params.limit ?? DEFAULT_LIMIT,
    }),
    [
      params.directionId,
      params.skillPointId,
      params.q,
      params.dueBefore,
      params.limit,
    ],
  );

  return useQuery<MemoryCard[]>({
    queryKey: ['card-search', normalized],
    queryFn: () =>
      searchCards({
        directionId: normalized.directionId,
        skillPointId: normalized.skillPointId,
        q: normalized.q || undefined,
        dueBefore: normalized.dueBefore,
        limit: normalized.limit,
      }),
    enabled: Boolean(
      normalized.q ||
        normalized.directionId ||
        normalized.skillPointId ||
        normalized.dueBefore,
    ),
    staleTime: 1000 * 30,
  });
};
