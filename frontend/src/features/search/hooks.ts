import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchSearchSuggestions,
  searchIndex,
  type SearchParams,
  type SearchResponse,
  type SearchSuggestionsResponse,
} from '@api';

const DEFAULT_LIMIT = 8;

export const useSearchResults = (params: SearchParams) => {
  const normalized = useMemo(
    () => ({
      q: params.q?.trim() ?? '',
      limit: params.limit ?? DEFAULT_LIMIT,
    }),
    [params.q, params.limit],
  );

  return useQuery<SearchResponse>({
    queryKey: ['search-index', normalized],
    queryFn: () =>
      searchIndex({
        q: normalized.q || undefined,
        limit: normalized.limit,
      }),
    enabled: normalized.q.length > 0,
    staleTime: 30_000,
  });
};

export const useSearchSuggestions = () =>
  useQuery<SearchSuggestionsResponse>({
    queryKey: ['search-suggestions'],
    queryFn: fetchSearchSuggestions,
    staleTime: 120_000,
  });
