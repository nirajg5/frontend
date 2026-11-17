import { apiFetch, executeApi } from '../../lib/api-client';
import { FailurePredictionRequest, IngestionResponse } from '../../types/api';

export const ingestionApi = {
  async submitIngestion(
    datasetName: string,
    predictionFeatures?: FailurePredictionRequest
  ): Promise<{ data: IngestionResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<IngestionResponse>(
          `/ingestion/dataset?dataset_name=${encodeURIComponent(datasetName)}`,
          {
            method: 'POST',
            body: predictionFeatures ? JSON.stringify(predictionFeatures) : undefined,
          }
        ),
      () => ({
        run_id: Math.floor(Math.random() * 900) + 100,
        pipeline_run_id: Math.floor(Math.random() * 900) + 100,
        pipeline_name: 'bronze_csv_ingestion',
        dataset_name: datasetName,
        rows_ingested: 1250,
        status: 'SUCCESS',
        prediction: predictionFeatures
          ? {
              failure_probability: 0.12,
              risk_category: 'LOW',
            }
          : null,
        prediction_error: null,
      })
    );
  },
};
