import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../../services/api/agentsApi';
import {
  AgentInvestigationResult,
  TaskStatusResponse,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bot,
  Clock,
  ShieldAlert,
  History,
  AlertCircle,
} from 'lucide-react';

const TERMINAL_STATUSES = ['COMPLETED', 'SUCCESS', 'SUCCEEDED', 'FAILED', 'FAILURE', 'ERROR'];

export const AgentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useConfig();
  const { isAdmin } = useAuth();

  // Investigation form state (strictly question-based per backend schema)
  const [question, setQuestion] = useState(
    'Investigate the recent failure in the orders pipeline.'
  );
  const [dispatchMode, setDispatchMode] = useState<'sync' | 'async'>('async');

  // History filter states (limit, offset, status, dataset_name)
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyDataset, setHistoryDataset] = useState('');

  // Polling & result state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<TaskStatusResponse | null>(null);
  const [activeResult, setActiveResult] = useState<AgentInvestigationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stale recovery modal (ADMIN only)
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState('30');

  const { data: historyData, isLoading: loadingHistory, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['agentHistory', historyStatus, historyDataset],
    queryFn: () =>
      agentsApi.getHistory({
        limit: 20,
        offset: 0,
        status: historyStatus !== 'all' ? historyStatus : undefined,
        dataset_name: historyDataset.trim() || undefined,
      }),
  });

  // Polling loop for Async Celery task
  useEffect(() => {
    if (!activeTaskId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const { data } = await agentsApi.getTaskStatus(activeTaskId);
        if (!isSubscribed) return;

        setPollingStatus(data);
        const stUpper = String(data.status).toUpperCase();

        if (TERMINAL_STATUSES.includes(stUpper)) {
          clearInterval(interval);
          setActiveTaskId(null);
          if (data.error) {
            setErrorMsg(data.error);
          }
          if (data.result) {
            setActiveResult(data.result as AgentInvestigationResult);
          }
          queryClient.invalidateQueries({ queryKey: ['agentHistory'] });
          addToast({
            type: stUpper.includes('FAIL') || stUpper === 'ERROR' ? 'error' : 'success',
            title: `Agent Task ${stUpper}`,
            message: `Task ${data.task_id} reached terminal status ${stUpper}.`,
          });
        }
      } catch (err) {
        clearInterval(interval);
        setActiveTaskId(null);
        const msg = err instanceof Error ? err.message : 'Task status polling error';
        setErrorMsg(msg);
        addToast({
          type: 'error',
          title: 'Polling Failed',
          message: msg,
        });
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeTaskId, queryClient, addToast]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await agentsApi.investigateSync({ question: question.trim() });
      return res.data;
    },
    onSuccess: (data) => {
      setActiveResult(data);
      refetchHistory();
      addToast({
        type: 'success',
        title: 'Synchronous Investigation Complete',
        message: 'LangGraph agent returned investigation findings.',
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'Investigation Failed',
        message: err.message,
      });
    },
  });

  const asyncMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await agentsApi.investigateAsync({ question: question.trim() });
      return res.data;
    },
    onSuccess: (data) => {
      setActiveTaskId(data.task_id);
      setPollingStatus({
        task_id: data.task_id,
        status: data.status || 'PENDING',
        current_step: data.message || 'Queued on Celery worker...',
      });
      addToast({
        type: 'info',
        title: 'Async Investigation Queued',
        message: `Polling task ID: ${data.task_id}`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'Async Dispatch Failed',
        message: err.message,
      });
    },
  });

  const recoverMutation = useMutation({
    mutationFn: async () => {
      const mins = parseInt(timeoutMinutes, 10) || 30;
      const res = await agentsApi.recoverStale(mins);
      return res.data;
    },
    onSuccess: (data) => {
      setRecoverModalOpen(false);
      refetchHistory();
      addToast({
        type: 'success',
        title: 'Stale Task Recovery Complete',
        message: data.message || `Recovered stale tasks.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Maintenance Failed',
        message: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (dispatchMode === 'sync') {
      syncMutation.mutate();
    } else {
      asyncMutation.mutate();
    }
  };

  const history = historyData?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            LangGraph Agent Investigations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Run synchronous (POST /agent/investigate) or Celery async (POST /agent/investigate/async) investigations
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecoverModalOpen(true)}
            leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
          >
            Recover Stale Tasks
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <CardTitle>Launch Investigation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                label="Investigation Question"
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Investigate the recent failure in the orders pipeline."
                required
              />

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Execution Mode
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      dispatchMode === 'async'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispatchMode"
                      value="async"
                      checked={dispatchMode === 'async'}
                      onChange={() => setDispatchMode('async')}
                    />
                    <span>Async (Celery)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      dispatchMode === 'sync'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispatchMode"
                      value="sync"
                      checked={dispatchMode === 'sync'}
                      onChange={() => setDispatchMode('sync')}
                    />
                    <span>Sync (Direct)</span>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={syncMutation.isPending || asyncMutation.isPending || !!activeTaskId}
                leftIcon={<Bot className="w-4 h-4" />}
                className="w-full"
              >
                {activeTaskId ? 'Polling Task...' : 'Run Investigation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results / Polling */}
        <div className="lg:col-span-2 space-y-6">
          {pollingStatus && activeTaskId && (
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-indigo-900">
                    <Clock className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>Task Status: {pollingStatus.status}</span>
                  </div>
                  <span className="font-mono text-indigo-700">{pollingStatus.task_id}</span>
                </div>
                {pollingStatus.current_step && (
                  <p className="text-xs text-indigo-800 font-mono">{pollingStatus.current_step}</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeResult ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Investigation Findings</CardTitle>
                  <p className="text-xs text-slate-500">
                    {activeResult.question || question}
                  </p>
                </div>
                {activeResult.status && <Badge variant="healthy">{activeResult.status}</Badge>}
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {(activeResult.root_cause || activeResult.summary || activeResult.answer) && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                      Findings
                    </h5>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {activeResult.root_cause || activeResult.summary || activeResult.answer}
                    </p>
                  </div>
                )}

                {(activeResult.recommendations || activeResult.mitigation_steps) && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                    <h5 className="font-bold text-emerald-900 uppercase text-[11px] tracking-wider">
                      Recommendations
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-emerald-900">
                      {(activeResult.recommendations || activeResult.mitigation_steps || []).map(
                        (step, idx) => (
                          <li key={idx}>{step}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {activeResult.steps_taken && activeResult.steps_taken.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-500 uppercase text-[11px] tracking-wider">
                      Execution Steps ({activeResult.steps_taken.length})
                    </h5>
                    {activeResult.steps_taken.map((step, i) => (
                      <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                        <span className="font-semibold text-indigo-700">
                          {step.agent_role || step.node || `Step ${i + 1}`}
                        </span>
                        {step.action && <p className="text-slate-800">{step.action}</p>}
                        {step.output && (
                          <pre className="p-2 bg-slate-50 rounded font-mono text-[11px] text-slate-700 overflow-x-auto">
                            {step.output}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <details className="pt-2 border-t border-slate-100">
                  <summary className="cursor-pointer font-semibold text-slate-500 hover:text-slate-800">
                    Inspect Raw Response JSON
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(activeResult, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ) : (
            !pollingStatus && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <Bot className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h4 className="text-sm font-semibold text-slate-800">Ready for Investigation</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Enter an investigation question on the left and launch an agent run.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <CardTitle>Investigation History (GET /agent/history)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter dataset_name..."
              value={historyDataset}
              onChange={(e) => setHistoryDataset(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50"
            />
            <select
              value={historyStatus}
              onChange={(e) => setHistoryStatus(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="all">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </CardHeader>
        {historyError ? (
          <CardContent className="text-xs text-rose-600">
            {historyError instanceof Error ? historyError.message : 'Failed to load investigation history.'}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">ID / Task ID</th>
                  <th className="px-5 py-3">Dataset</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Question</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loadingHistory &&
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-medium text-slate-900">
                        {item.task_id || `#${item.id}`}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700">{item.dataset_name || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={
                            String(item.status).toUpperCase() === 'COMPLETED'
                              ? 'healthy'
                              : String(item.status).toUpperCase() === 'FAILED'
                              ? 'failing'
                              : 'degraded'
                          }
                          size="sm"
                          dot
                        >
                          {String(item.status).toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 max-w-sm truncate text-slate-700">
                        {item.question || item.query}
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {(item.duration_seconds ?? item.duration_sec) !== undefined
                          ? `${item.duration_seconds ?? item.duration_sec}s`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                {!loadingHistory && history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No agent investigations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stale Task Recovery Modal (ADMIN only) */}
      <Modal
        isOpen={recoverModalOpen}
        onClose={() => setRecoverModalOpen(false)}
        title="Recover Stale Agent Tasks"
        description="POST /agent/maintenance/recover-stale?timeout_minutes=..."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setRecoverModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={recoverMutation.isPending}
              onClick={() => recoverMutation.mutate()}
            >
              Confirm Recovery
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Requires <strong>ADMIN</strong> permission. Marks stale running/queued investigation tasks older than the timeout threshold as failed/recovered.
          </p>
          <Input
            label="Timeout Minutes"
            type="number"
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
