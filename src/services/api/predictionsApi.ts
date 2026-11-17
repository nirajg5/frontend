import { apiFetch, executeApi } from '../../lib/api-client';
import {
  DEMO_MODEL_STATUS,
  DEMO_PREDICTION_RESULT,
  DEMO_PREDICTION_HISTORY,
  DEMO_MODEL_EVALUATION,
} from '../../mocks/fixtures';
import {
  FailurePredictionRequest,
  ModelStatusResponse,
  PredictionResultResponse,
  PredictionHistoryItem,
  ModelEvaluationResponse,
} from '../../types/api';

export const predictionsApi = {
  async getModelStatus(): Promise<{ data: ModelStatusResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<ModelStatusResponse>('/predictions/failure/model-status', {
          method: 'GET',
        }),
      () => DEMO_MODEL_STATUS
    );
  },

  async predictFailure(
    datasetName: string,
    payload: FailurePredictionRequest
  ): Promise<{ data: PredictionResultResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<PredictionResultResponse>(
          `/predictions/failure/${encodeURIComponent(datasetName)}`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        ),
      () => ({
        ...DEMO_PREDICTION_RESULT,
        dataset_name: datasetName,
        timestamp: new Date().toISOString(),
      })
    );
  },

  async getPredictionHistory(
    datasetName: string
  ): Promise<{ data: PredictionHistoryItem[]; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<PredictionHistoryItem[]>(
          `/predictions/failure/${encodeURIComponent(datasetName)}/history`,
          { method: 'GET' }
        ),
      () => DEMO_PREDICTION_HISTORY.filter((p) => p.dataset_name === datasetName || true)
    );
  },

  async getEvaluation(): Promise<{ data: ModelEvaluationResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<ModelEvaluationResponse>('/predictions/evaluation', { method: 'GET' }),
      () => DEMO_MODEL_EVALUATION
    );
  },
};
