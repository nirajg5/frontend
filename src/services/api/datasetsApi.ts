import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_DATASETS } from '../../mocks/fixtures';
import { DatasetItem, DatasetCreateRequest } from '../../types/api';

export const datasetsApi = {
  async getDatasets(): Promise<{ data: DatasetItem[]; isLive: boolean }> {
    return executeApi(
      () => apiFetch<DatasetItem[]>('/datasets/', { method: 'GET' }),
      () => DEMO_DATASETS
    );
  },

  async registerDataset(
    payload: DatasetCreateRequest
  ): Promise<{ data: DatasetItem; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<DatasetItem>('/datasets/', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => ({
        id: Date.now(),
        dataset_name: payload.dataset_name,
        source_type: payload.source_type,
        source_name: payload.source_name,
        source_path: payload.source_path,
        owner: payload.owner || 'admin',
      })
    );
  },
};
