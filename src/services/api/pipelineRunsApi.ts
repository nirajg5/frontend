import { apiFetch, executeApi } from '../../lib/api-client';
import {
  DEMO_PIPELINE_RUNS,
  DEMO_PIPELINE_SUMMARY,
  DEMO_PIPELINE_RUN_DETAIL,
} from '../../mocks/fixtures';
import {
  PipelineRunItem,
  PipelineSummaryResponse,
  PipelineRunDetail,
} from '../../types/api';

export const pipelineRunsApi = {
  async getRuns(filters?: {
    status?: string;
    dataset_name?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: PipelineRunItem[]; isLive: boolean }> {
    return executeApi(
      () => {
        const params = new URLSearchParams();
        if (filters?.status && filters.status !== 'all') {
          params.set('status', filters.status);
        }
        if (filters?.dataset_name && filters.dataset_name !== 'all') {
          params.set('dataset_name', filters.dataset_name);
        }
        if (filters?.limit !== undefined) {
          params.set('limit', String(filters.limit));
        }
        if (filters?.offset !== undefined) {
          params.set('offset', String(filters.offset));
        }
        const qs = params.toString();
        return apiFetch<PipelineRunItem[]>(`/pipeline-runs${qs ? `?${qs}` : ''}`, {
          method: 'GET',
        });
      },
      () => {
        let results = [...DEMO_PIPELINE_RUNS];
        if (filters?.status && filters.status !== 'all') {
          results = results.filter(
            (r) => r.status.toUpperCase() === filters.status?.toUpperCase()
          );
        }
        if (filters?.dataset_name && filters.dataset_name !== 'all') {
          results = results.filter((r) => r.dataset_name === filters.dataset_name);
        }
        const offset = filters?.offset || 0;
        const limit = filters?.limit || results.length;
        return results.slice(offset, offset + limit);
      }
    );
  },

  async getSummary(): Promise<{ data: PipelineSummaryResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<PipelineSummaryResponse>('/pipeline-runs/summary', { method: 'GET' }),
      () => DEMO_PIPELINE_SUMMARY
    );
  },

  async getRunById(
    runId: number
  ): Promise<{ data: PipelineRunDetail; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<PipelineRunDetail>(
          `/pipeline-runs/${encodeURIComponent(String(runId))}`,
          { method: 'GET' }
        ),
      () => {
        const found = DEMO_PIPELINE_RUNS.find((r) => r.run_id === runId);
        return found ? { ...found, logs: DEMO_PIPELINE_RUN_DETAIL.logs } : DEMO_PIPELINE_RUN_DETAIL;
      }
    );
  },
};
