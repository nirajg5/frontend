import { apiFetch, executeApi } from '../../lib/api-client';
import {
  DEMO_AGENT_RESULT,
  DEMO_AGENT_HISTORY,
  DEMO_AGENT_METRICS,
} from '../../mocks/fixtures';
import {
  AgentInvestigateRequest,
  AgentInvestigationResult,
  AsyncTaskResponse,
  TaskStatusResponse,
  AgentInvestigationSummary,
  RecoverStaleResponse,
  AgentMetricsResponse,
} from '../../types/api';

const demoAsyncTasks = new Map<string, { startTime: number; question: string }>();

export const agentsApi = {
  async investigateSync(
    payload: AgentInvestigateRequest
  ): Promise<{ data: AgentInvestigationResult; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<AgentInvestigationResult>('/agent/investigate', {
          method: 'POST',
          body: JSON.stringify({ question: payload.question }),
          timeoutMs: 60000,
        }),
      () => ({
        ...DEMO_AGENT_RESULT,
        question: payload.question,
        completed_at: new Date().toISOString(),
      })
    );
  },

  async investigateAsync(
    payload: AgentInvestigateRequest
  ): Promise<{ data: AsyncTaskResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<AsyncTaskResponse>('/agent/investigate/async', {
          method: 'POST',
          body: JSON.stringify({ question: payload.question }),
        }),
      () => {
        const taskId = `demo-task-${Date.now()}`;
        demoAsyncTasks.set(taskId, { startTime: Date.now(), question: payload.question });
        return {
          task_id: taskId,
          status: 'PENDING',
          message: 'Demo async investigation queued.',
          created_at: new Date().toISOString(),
        };
      }
    );
  },

  async getTaskStatus(
    taskId: string
  ): Promise<{ data: TaskStatusResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<TaskStatusResponse>(
          `/agent/tasks/${encodeURIComponent(taskId)}`,
          { method: 'GET' }
        ),
      () => {
        const item = demoAsyncTasks.get(taskId);
        if (!item || Date.now() - item.startTime >= 3000) {
          return {
            task_id: taskId,
            status: 'COMPLETED',
            progress: 100,
            result: {
              ...DEMO_AGENT_RESULT,
              question: item?.question || DEMO_AGENT_RESULT.question,
            },
            updated_at: new Date().toISOString(),
          };
        }
        return {
          task_id: taskId,
          status: 'RUNNING',
          progress: 50,
          current_step: 'Executing LangGraph diagnostic nodes...',
          updated_at: new Date().toISOString(),
        };
      }
    );
  },

  async getHistory(filters?: {
    limit?: number;
    offset?: number;
    status?: string;
    dataset_name?: string;
  }): Promise<{ data: AgentInvestigationSummary[]; isLive: boolean }> {
    return executeApi(
      () => {
        const params = new URLSearchParams();
        if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
        if (filters?.offset !== undefined) params.set('offset', String(filters.offset));
        if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
        if (filters?.dataset_name && filters.dataset_name !== 'all') {
          params.set('dataset_name', filters.dataset_name);
        }
        const qs = params.toString();
        return apiFetch<AgentInvestigationSummary[]>(
          `/agent/history${qs ? `?${qs}` : ''}`,
          { method: 'GET' }
        );
      },
      () => DEMO_AGENT_HISTORY
    );
  },

  async recoverStale(
    timeoutMinutes = 30
  ): Promise<{ data: RecoverStaleResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<RecoverStaleResponse>(
          `/agent/maintenance/recover-stale?timeout_minutes=${encodeURIComponent(
            String(timeoutMinutes)
          )}`,
          { method: 'POST' }
        ),
      () => ({
        tasks_inspected: 4,
        recovered_count: 1,
        message: `Demo recovery completed for tasks older than ${timeoutMinutes} minutes.`,
        timestamp: new Date().toISOString(),
      })
    );
  },

  async getMetrics(): Promise<{ data: AgentMetricsResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<AgentMetricsResponse>('/agent/metrics', { method: 'GET' }),
      () => DEMO_AGENT_METRICS
    );
  },
};
