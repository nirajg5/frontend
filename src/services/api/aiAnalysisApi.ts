import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_AI_ANALYSIS } from '../../mocks/fixtures';
import { AIAnalysisDemoRequest, AIAnalysisResponse } from '../../types/api';

export const aiAnalysisApi = {
  async runDemoAnalysis(
    payload: AIAnalysisDemoRequest
  ): Promise<{ data: AIAnalysisResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<AIAnalysisResponse>('/ai-analysis/demo', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => ({
        ...DEMO_AI_ANALYSIS,
        dataset_name: payload.dataset_name,
        incident_code: 'DEMO-SIMULATION',
        root_cause: `Simulated analysis for ${payload.incident_type} (${payload.severity}): ${payload.error_message}`,
      })
    );
  },

  async analyzeIncident(
    incidentCode: string
  ): Promise<{ data: AIAnalysisResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<AIAnalysisResponse>(
          `/ai-analysis/${encodeURIComponent(incidentCode)}`,
          { method: 'POST' }
        ),
      () => ({
        ...DEMO_AI_ANALYSIS,
        incident_code: incidentCode,
      })
    );
  },
};
