import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { pipelineRunsApi } from '../../services/api/pipelineRunsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  PlaySquare,
  Terminal,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const PipelineRunsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datasetFilter, setDatasetFilter] = useState<string>('all');
  const [limit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);

  const initialRunParam = searchParams.get('run_id');
  const [selectedRunId, setSelectedRunId] = useState<number | null>(
    initialRunParam && !isNaN(Number(initialRunParam)) ? Number(initialRunParam) : null
  );

  useEffect(() => {
    const runIdStr = searchParams.get('run_id');
    if (runIdStr && !isNaN(Number(runIdStr))) {
      setSelectedRunId(Number(runIdStr));
    }
  }, [searchParams]);

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['pipelineRunsSummary'],
    queryFn: () => pipelineRunsApi.getSummary(),
  });

  const { data: runsData, isLoading, error, refetch: refetchRuns } = useQuery({
    queryKey: ['pipelineRunsList', statusFilter, datasetFilter, limit, offset],
    queryFn: () =>
      pipelineRunsApi.getRuns({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dataset_name: datasetFilter !== 'all' ? datasetFilter : undefined,
        limit,
        offset,
      }),
  });

  const { data: detailData, isLoading: isDetailLoading, error: detailError } = useQuery({
    queryKey: ['pipelineRunDetail', selectedRunId],
    queryFn: () => pipelineRunsApi.getRunById(selectedRunId!),
    enabled: selectedRunId !== null,
  });

  const summary = summaryData?.data;
  const runs = runsData?.data || [];
  const runDetail = detailData?.data;

  const handleOpenDetail = (runId: number) => {
    setSelectedRunId(runId);
    setSearchParams({ run_id: String(runId) });
  };

  const handleCloseDetail = () => {
    setSelectedRunId(null);
    setSearchParams({});
  };

  const getStatusBadge = (status: string) => {
    const st = String(status).toUpperCase();
    if (st === 'SUCCESS' || st === 'COMPLETED') {
      return <Badge variant="healthy" size="sm" dot>{st}</Badge>;
    }
    if (st === 'FAILED' || st === 'ERROR') {
      return <Badge variant="failing" size="sm" dot>{st}</Badge>;
    }
    if (st === 'RUNNING' || st === 'STARTED') {
      return <Badge variant="degraded" size="sm" dot>{st}</Badge>;
    }
    return <Badge variant="neutral" size="sm" dot>{st}</Badge>;
  };

  const passRate =
    summary && summary.total_runs > 0
      ? summary.pass_rate ?? summary.success_rate ?? Number(((summary.successful_runs / summary.total_runs) * 100).toFixed(1))
      : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Runs Monitoring</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track execution history, row counts, durations, and failure traces (GET /pipeline-runs)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchSummary();
            refetchRuns();
          }}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Runs
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Runs</p>
          <h4 className="text-xl font-bold text-slate-900 mt-1">{summary?.total_runs ?? '—'}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Successful</p>
          <h4 className="text-xl font-bold text-emerald-700 mt-1">{summary?.successful_runs ?? '—'}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Failed</p>
          <h4 className="text-xl font-bold text-rose-700 mt-1">{summary?.failed_runs ?? '—'}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Pass Rate</p>
          <h4 className="text-xl font-bold text-indigo-700 mt-1">
            {passRate !== null ? `${passRate}%` : '—'}
          </h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Duration</p>
          <h4 className="text-xl font-bold text-slate-900 mt-1">
            {summary?.avg_duration_seconds !== undefined
              ? `${summary.avg_duration_seconds}s`
              : summary?.avg_duration_sec !== undefined
              ? `${summary.avg_duration_sec}s`
              : '—'}
          </h4>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {['all', 'SUCCESS', 'FAILED', 'RUNNING'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setOffset(0);
                  setStatusFilter(st);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="text-slate-400 font-medium">Dataset:</span>
            <select
              value={datasetFilter}
              onChange={(e) => {
                setOffset(0);
                setDatasetFilter(e.target.value);
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Datasets</option>
              {(datasetsData?.data || []).map((ds) => (
                <option key={ds.dataset_name} value={ds.dataset_name}>
                  {ds.dataset_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Prev
          </Button>
          <span className="text-slate-500 font-mono text-[11px]">
            Offset {offset}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={runs.length < limit}
            onClick={() => setOffset(offset + limit)}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error instanceof Error ? error.message : 'Failed to load pipeline runs.'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchRuns()}>
            Retry
          </Button>
        </div>
      )}

      {/* Runs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Run ID</th>
                <th className="px-5 py-3.5">Pipeline Name</th>
                <th className="px-5 py-3.5">Dataset</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Read / Proc / Load</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Started At</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading pipeline runs...
                  </td>
                </tr>
              )}

              {!isLoading &&
                runs.map((run) => {
                  const rid = run.run_id ?? run.id!;
                  const dur = run.duration_seconds ?? run.duration_sec;
                  return (
                    <tr key={rid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">#{rid}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleOpenDetail(rid)}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                        >
                          {run.pipeline_name}
                        </button>
                        {run.error_message && (
                          <p className="text-[11px] text-rose-600 font-medium truncate max-w-xs mt-0.5">
                            {run.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-700">{run.dataset_name}</td>
                      <td className="px-5 py-4">{getStatusBadge(run.status)}</td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-700">
                        {run.rows_read ?? '—'} / {run.rows_processed ?? '—'} / {run.rows_loaded ?? '—'}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {dur !== null && dur !== undefined ? `${dur}s` : '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {run.started_at
                          ? new Date(run.started_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(rid)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && !error && runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <PlaySquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No pipeline runs returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Individual Run Detail Modal (GET /pipeline-runs/{run_id}) */}
      <Modal
        isOpen={selectedRunId !== null}
        onClose={handleCloseDetail}
        title={runDetail?.pipeline_name || `Pipeline Run #${selectedRunId}`}
        description={`Run ID: #${selectedRunId} | Dataset: ${runDetail?.dataset_name || '—'}`}
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {runDetail?.status && getStatusBadge(runDetail.status)}
            </div>
            <Button variant="secondary" size="sm" onClick={handleCloseDetail}>
              Close
            </Button>
          </div>
        }
      >
        {isDetailLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading run details...
          </div>
        ) : detailError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {detailError instanceof Error ? detailError.message : 'Failed to load run details.'}
          </div>
        ) : runDetail ? (
          <div className="space-y-5 text-xs">
            {runDetail.error_message && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Execution Error
                </div>
                <p className="text-[11px] font-mono leading-relaxed bg-white/80 p-2 rounded border border-rose-200">
                  {runDetail.error_message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Read</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {runDetail.rows_read?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Processed</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {runDetail.rows_processed?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Loaded</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {runDetail.rows_loaded?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Duration</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {(runDetail.duration_seconds ?? runDetail.duration_sec) !== null &&
                  (runDetail.duration_seconds ?? runDetail.duration_sec) !== undefined
                    ? `${runDetail.duration_seconds ?? runDetail.duration_sec}s`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Started At</span>
                <p className="font-mono text-slate-800 mt-0.5">
                  {runDetail.started_at ? new Date(runDetail.started_at).toLocaleString() : '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Completed At</span>
                <p className="font-mono text-slate-800 mt-0.5">
                  {runDetail.completed_at ? new Date(runDetail.completed_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {runDetail.logs && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-600" /> Execution Logs
                </h4>
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 scrollbar-thin">
                  {runDetail.logs}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
