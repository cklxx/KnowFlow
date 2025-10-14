import { buildUrl, apiConfig } from './config';

type FetchOptions = RequestInit & { params?: Record<string, string | undefined> };

const toQueryString = (params?: Record<string, string | undefined>): string => {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) return '';
  const search = new URLSearchParams(entries as [string, string][]);
  return `?${search.toString()}`;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${buildUrl(path)}${toQueryString(options.params)}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...apiConfig.defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
