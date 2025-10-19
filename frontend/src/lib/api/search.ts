import { apiFetch } from './client';
import type { SearchResponse, SearchSuggestionsResponse } from './types';

export type SearchParams = {
  q?: string;
  limit?: number;
};

export const searchIndex = (params: SearchParams) =>
  apiFetch<SearchResponse>('/api/search', {
    params: {
      q: params.q,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });

export const fetchSearchSuggestions = () =>
  apiFetch<SearchSuggestionsResponse>('/api/search/suggestions');
