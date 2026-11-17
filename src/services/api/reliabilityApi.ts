import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_RELIABILITY_SCORES } from '../../mocks/fixtures';
import { ReliabilityScoreResponse } from '../../types/api';

export const reliabilityApi = {
  async calculateReliability(
    datasetType: string
  ): Promise<{ data: ReliabilityScoreResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<ReliabilityScoreResponse>(
          `/reliability/calculate/${encodeURIComponent(datasetType)}`,
          { method: 'POST' }
        ),
      () =>
        DEMO_RELIABILITY_SCORES[datasetType] || {
          dataset_name: `bronze_${datasetType}`,
          quality_score: 95,
          freshness_score: 92,
          pipeline_score: 90,
          overall_score: 92.8,
          status: 'HEALTHY',
          recent_pipeline_runs: 10,
          successful_pipeline_runs: 9,
          persisted: true,
          reliability_record_id: 14,
          calculated_at: new Date().toISOString(),
        }
    );
  },
};
