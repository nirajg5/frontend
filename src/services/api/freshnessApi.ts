import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_FRESHNESS_RESULT } from '../../mocks/fixtures';
import { FreshnessResult } from '../../types/api';

export const freshnessApi = {
  async checkFreshness(
    datasetName: string
  ): Promise<{ data: FreshnessResult; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<FreshnessResult>(
          `/freshness/check/${encodeURIComponent(datasetName)}`,
          { method: 'POST' }
        ),
      () =>
        DEMO_FRESHNESS_RESULT[datasetName] || {
          dataset_name: datasetName,
          sla_hours: 24,
          actual_update_time: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          expected_update_time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          age_hours: 4.0,
          freshness_status: 'FRESH',
          freshness_score: 96,
          checked_at: new Date().toISOString(),
        }
    );
  },
};
