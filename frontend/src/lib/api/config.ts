const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export const apiConfig = {
  baseUrl: API_BASE_URL,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
};

export const buildUrl = (path: string) => `${apiConfig.baseUrl}${path}`;
