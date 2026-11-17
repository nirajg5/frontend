import { apiFetch, executeApi } from '../../lib/api-client';
import {
  DEMO_ROOT_INFO,
  DEMO_HEALTH,
  DEMO_DB_HEALTH,
} from '../../mocks/fixtures';
import {
  RootResponse,
  HealthResponse,
  DatabaseHealthResponse,
} from '../../types/api';

export const healthApi = {
  async getRoot(): Promise<{ data: RootResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<RootResponse>('/', { method: 'GET', skipAuth: true }),
      () => DEMO_ROOT_INFO
    );
  },

  async getHealth(): Promise<{ data: HealthResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<HealthResponse>('/health', { method: 'GET', skipAuth: true }),
      () => DEMO_HEALTH
    );
  },

  async getDatabaseHealth(): Promise<{ data: DatabaseHealthResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<DatabaseHealthResponse>('/health/database', {
          method: 'GET',
          skipAuth: true,
        }),
      () => DEMO_DB_HEALTH
    );
  },
};
