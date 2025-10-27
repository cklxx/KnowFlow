import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types/api';

// Get API base URL from environment variable or use default
const getApiBaseUrl = (): string => {
  // In development, we use Vite's proxy (/api -> http://localhost:3000)
  // In production, the API base URL should be set via env variable
  if (import.meta.env.DEV) {
    return '/api';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

/**
 * Create and configure Axios instance for API requests
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add any auth tokens here if needed in the future
      // const token = localStorage.getItem('auth_token');
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      // Handle common errors
      if (error.response) {
        const apiError: ApiError = {
          message: error.response.data?.message || 'An error occurred',
          code: error.response.data?.code,
          details: error.response.data?.details,
        };

        // Log errors in development
        if (import.meta.env.DEV) {
          console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response.status,
            error: apiError,
          });
        }

        return Promise.reject(apiError);
      }

      // Network error
      if (error.request) {
        const networkError: ApiError = {
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR',
        };
        return Promise.reject(networkError);
      }

      // Request setup error
      const requestError: ApiError = {
        message: error.message || 'Request failed',
        code: 'REQUEST_ERROR',
      };
      return Promise.reject(requestError);
    }
  );

  return client;
};

// Export singleton instance
export const apiClient = createApiClient();

// Export helper function for creating custom instances if needed
export { createApiClient };
