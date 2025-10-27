/**
 * API Module - Centralized API client and endpoints
 *
 * This module exports all API endpoints for the KnowFlow application.
 * It provides a clean interface for making HTTP requests to the backend.
 */

// Export API client
export { apiClient, createApiClient } from './client';

// Export all API endpoint modules
export { cardsApi } from './cards';
export { directionsApi } from './directions';
export { intelligenceApi } from './intelligence';
export { importApi } from './import';
export { progressApi } from './progress';
export { searchApi } from './search';
export { settingsApi } from './settings';
export { todayApi } from './today';
export { treeApi } from './tree';
export { vaultApi } from './vault';

// Re-export types for convenience
export type * from '../types/api';
