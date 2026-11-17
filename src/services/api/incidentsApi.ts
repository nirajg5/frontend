import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_INCIDENTS } from '../../mocks/fixtures';
import {
  IncidentItem,
  IncidentDetectResponse,
  PipelineFailureDetectResponse,
} from '../../types/api';

let demoIncidents = [...DEMO_INCIDENTS];

export const incidentsApi = {
  async getIncidents(filters?: {
    status?: string;
  }): Promise<{ data: IncidentItem[]; isLive: boolean }> {
    return executeApi(
      () => {
        const params = new URLSearchParams();
        if (filters?.status && filters.status !== 'all') {
          params.set('status', filters.status);
        }
        const qs = params.toString();
        return apiFetch<IncidentItem[]>(`/incidents/${qs ? `?${qs}` : ''}`, {
          method: 'GET',
        });
      },
      () => {
        if (filters?.status && filters.status !== 'all') {
          return demoIncidents.filter(
            (inc) => inc.status.toUpperCase() === filters.status?.toUpperCase()
          );
        }
        return [...demoIncidents];
      }
    );
  },

  async detectDatasetIncidents(
    datasetName: string
  ): Promise<{ data: IncidentDetectResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<IncidentDetectResponse>(
          `/incidents/detect/${encodeURIComponent(datasetName)}`,
          { method: 'POST' }
        ),
      () => ({
        dataset_name: datasetName,
        incidents_detected: 0,
        incident_codes: [],
        message: `Demo anomaly scan finished for ${datasetName}`,
      })
    );
  },

  async detectPipelineFailures(
    datasetName: string
  ): Promise<{ data: PipelineFailureDetectResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<PipelineFailureDetectResponse>(
          `/incidents/detect-pipeline-failures/${encodeURIComponent(datasetName)}`,
          { method: 'POST' }
        ),
      () => ({
        dataset_name: datasetName,
        new_failures_flagged: demoIncidents.filter((i) => i.dataset_name === datasetName).length,
        incidents: demoIncidents.filter((i) => i.dataset_name === datasetName),
      })
    );
  },

  async resolveIncident(
    incidentCode: string
  ): Promise<{ data: IncidentItem; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<IncidentItem>(
          `/incidents/${encodeURIComponent(incidentCode)}/resolve`,
          { method: 'PATCH' }
        ),
      () => {
        const idx = demoIncidents.findIndex((i) => i.incident_code === incidentCode);
        if (idx >= 0) {
          demoIncidents[idx] = {
            ...demoIncidents[idx],
            status: 'RESOLVED',
            resolved_at: new Date().toISOString(),
          };
          return demoIncidents[idx];
        }
        return {
          incident_code: incidentCode,
          dataset_name: 'bronze_orders',
          severity: 'MEDIUM',
          status: 'RESOLVED',
          description: 'Incident resolved in demo mode.',
          resolved_at: new Date().toISOString(),
        };
      }
    );
  },
};
