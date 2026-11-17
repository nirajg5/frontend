import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  PlaySquare,
  AlertOctagon,
  Activity,
  Bot,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { pipelineRunsApi } from '../../services/api/pipelineRunsApi';
import { incidentsApi } from '../../services/api/incidentsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { predictionsApi } from '../../services/api/predictionsApi';
import { healthApi } from '../../services/api/healthApi';
import { agentsApi } from '../../services/api/agentsApi';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data: runsSummary, isLoading: loadingSummary, error: summaryError } = useQuery({
    queryKey: ['pipelineRunsSummary'],
    queryFn: () => pipelineRunsApi.getSummary(),
  });

  const { data: recentRuns, isLoading: loadingRuns, error: runsError } = useQuery({
    queryKey: ['recentRuns'],
    queryFn: () => pipelineRunsApi.getRuns({ limit: 6 }),
  });

  const { data: incidentsData, error: incidentsError } = useQuery({
    queryKey: ['incidentsList'],
    queryFn: () => incidentsApi.getIncidents(),
  });

  const { data: datasetsData, error: datasetsError } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const { data: modelStatusData, error: modelError } = useQuery({
    queryKey: ['modelStatus'],
    queryFn: () => predictionsApi.getModelStatus(),
  });

  const { data: healthData, error: healthError } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => healthApi.getHealth(),
  });

  const { data: dbHealthData, error: dbHealthError } = useQuery({
    queryKey: ['dbHealth'],
    queryFn: () => healthApi.getDatabaseHealth(),
    retry: 0,
  });

  const { data: agentMetricsData, error: agentMetricsError } = useQuery({
    queryKey: ['agentMetrics'],
    queryFn: () => agentsApi.getMetrics(),
    enabled: isAdmin,
    retry: 0,
  });

  const summary = runsSummary?.data;
  const datasets = datasetsData?.data;
  const incidents = incidentsData?.data;
  const openIncidents = (incidents || []).filter(
    (i) => i.status?.toUpperCase() !== 'RESOLVED' && i.status?.toUpperCase() !== 'DISMISSED'
  );
  const criticalIncidents = openIncidents.filter(
    (i) => i.severity?.toUpperCase() === 'CRITICAL' || i.severity?.toUpperCase() === 'HIGH'
  );

  // Derive chart strictly from real summary counts returned by backend
  const summaryChartData = summary
    ? [
        { category: 'Total Runs', count: summary.total_runs },
        { category: 'Successful', count: summary.successful_runs },
        { category: 'Failed', count: summary.failed_runs },
        ...(summary.running_runs !== undefined
          ? [{ category: 'Running', count: summary.running_runs }]
          : []),
      ]
    : [];

  const passRatePct =
    summary && summary.total_runs > 0
      ? summary.pass_rate !== undefined
        ? `${summary.pass_rate}%`
        : summary.success_rate !== undefined
        ? `${summary.success_rate}%`
        : `${((summary.successful_runs / summary.total_runs) * 100).toFixed(1)}%`
      : 'Unavailable';

  const modelAvailable =
    modelStatusData?.data.model_available ??
    modelStatusData?.data.is_trained ??
    (modelStatusData?.data.status ? modelStatusData.data.status.toUpperCase() === 'READY' || modelStatusData.data.status.toUpperCase() === 'ACTIVE' : undefined);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Enterprise Observability
              </span>
              <span className="text-xs text-slate-400">FastAPI + PostgreSQL + LangGraph</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              DataSentinel Reliability Control Plane
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Live monitoring for CSV ingestion, Bronze/Silver/Gold ETL, data quality contracts, SLA freshness, ML failure prediction, and agentic investigations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => navigate('/incidents')}
              leftIcon={<AlertOctagon className="w-3.5 h-3.5 text-rose-400" />}
            >
              Incidents ({incidents ? openIncidents.length : '—'})
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-600/30"
              onClick={() => navigate('/agents')}
              leftIcon={<Bot className="w-3.5 h-3.5" />}
            >
              Agent Investigation
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Datasets"
          value={datasetsError ? 'Unavailable' : datasets ? datasets.length : '—'}
          subtitle={datasetsError ? 'Failed to query GET /datasets/' : 'Derived from GET /datasets/'}
          icon={<Database className="w-4 h-4" />}
          status={datasetsError ? 'warning' : 'neutral'}
          onClick={() => navigate('/datasets')}
        />
        <StatCard
          title="Pipeline Pass Rate"
          value={summaryError ? 'Unavailable' : loadingSummary ? '...' : passRatePct}
          subtitle={
            summary
              ? `${summary.successful_runs} passed / ${summary.total_runs} total runs`
              : summaryError
              ? 'GET /pipeline-runs/summary error'
              : 'Loading summary...'
          }
          icon={<PlaySquare className="w-4 h-4" />}
          status={summaryError ? 'warning' : 'healthy'}
          onClick={() => navigate('/pipeline-runs')}
        />
        <StatCard
          title="Open Incidents"
          value={incidentsError ? 'Unavailable' : incidents ? openIncidents.length : '—'}
          subtitle={
            incidentsError
              ? 'GET /incidents/ failed'
              : `${criticalIncidents.length} high/critical priority`
          }
          icon={<AlertOctagon className="w-4 h-4" />}
          status={
            incidentsError
              ? 'warning'
              : criticalIncidents.length > 0
              ? 'critical'
              : openIncidents.length > 0
              ? 'warning'
              : 'healthy'
          }
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          title="Failure Prediction Model"
          value={
            modelError
              ? 'Unavailable'
              : modelStatusData
              ? modelAvailable
                ? 'Available'
                : String(modelStatusData.data.status || 'Not Ready')
              : '—'
          }
          subtitle={
            modelStatusData?.data.model_name
              ? `${modelStatusData.data.model_name} (${modelStatusData.data.version || modelStatusData.data.model_version || 'loaded'})`
              : 'GET /predictions/failure/model-status'
          }
          icon={<Activity className="w-4 h-4" />}
          status={modelError ? 'warning' : modelAvailable ? 'healthy' : 'neutral'}
          onClick={() => navigate('/predictions')}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Agent Investigations</p>
              {!isAdmin ? (
                <>
                  <h4 className="text-sm font-bold text-slate-700 mt-0.5">ADMIN Restricted</h4>
                  <p className="text-[11px] text-slate-400">Metrics require ADMIN role</p>
                </>
              ) : agentMetricsError ? (
                <>
                  <h4 className="text-sm font-bold text-rose-600 mt-0.5">Unavailable</h4>
                  <p className="text-[11px] text-slate-400">GET /agent/metrics error</p>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-bold text-slate-900">
                    {agentMetricsData?.data.total_investigations ?? '—'} runs
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {agentMetricsData?.data.success_rate !== undefined
                      ? `${agentMetricsData.data.success_rate}% success rate`
                      : 'LangGraph worker telemetry'}
                  </p>
                </>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(isAdmin ? '/agent-metrics' : '/agents')}>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${healthError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Core API Health</p>
              <h4 className="text-lg font-bold text-slate-900 capitalize">
                {healthError ? 'Unreachable' : healthData?.data.status || '—'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {healthError ? 'GET /health failed' : 'FastAPI endpoint /health'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/health')}>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${dbHealthError ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Database Connectivity</p>
              <h4 className={`text-lg font-bold capitalize ${dbHealthError ? 'text-rose-700' : 'text-slate-900'}`}>
                {dbHealthError
                  ? 'Disconnected'
                  : dbHealthData?.data.status || '—'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {dbHealthError
                  ? dbHealthError instanceof Error
                    ? dbHealthError.message.slice(0, 42)
                    : 'PostgreSQL unreachable'
                  : dbHealthData?.data.latency_ms !== undefined
                  ? `Latency: ${dbHealthData.data.latency_ms} ms`
                  : 'GET /health/database'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/health')}>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Main Charts & Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Pipeline Run Summary Breakdown</CardTitle>
              <p className="text-xs text-slate-500">Derived directly from GET /pipeline-runs/summary</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/pipeline-runs')}>
              View All Runs
            </Button>
          </CardHeader>
          <CardContent>
            {summaryChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Run Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
                {summaryError ? (
                  <>
                    <AlertTriangle className="w-7 h-7 text-rose-400 mb-2" />
                    <span>{summaryError instanceof Error ? summaryError.message : 'Unable to load pipeline summary'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    <span>Loading pipeline summary...</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Incidents Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Open Incidents</CardTitle>
                <p className="text-xs text-slate-500">From GET /incidents/</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidentsError ? (
              <div className="py-8 text-center text-rose-600 text-xs">
                <AlertTriangle className="w-7 h-7 mx-auto mb-2" />
                {incidentsError instanceof Error ? incidentsError.message : 'Failed to load incidents'}
              </div>
            ) : (
              <>
                {openIncidents.slice(0, 3).map((incident) => (
                  <div
                    key={incident.incident_code}
                    onClick={() => navigate('/incidents')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {incident.incident_code}
                      </span>
                      <Badge
                        variant={
                          incident.severity?.toUpperCase() === 'CRITICAL'
                            ? 'critical'
                            : incident.severity?.toUpperCase() === 'HIGH'
                            ? 'high'
                            : 'medium'
                        }
                        size="sm"
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                    <h5 className="text-xs font-semibold text-slate-900 line-clamp-1">
                      {incident.title || incident.incident_type || incident.incident_code}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{incident.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="font-medium text-slate-600">{incident.dataset_name}</span>
                      <span>
                        {incident.detected_at || incident.created_at
                          ? new Date((incident.detected_at || incident.created_at)!).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}

                {incidents && openIncidents.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    No open incidents reported.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Pipeline Runs Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Pipeline Executions</CardTitle>
            <p className="text-xs text-slate-500">Latest jobs returned by GET /pipeline-runs</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/pipeline-runs')}>
            Run History
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Run ID</th>
                <th className="px-5 py-3">Pipeline</th>
                <th className="px-5 py-3">Dataset</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Rows Loaded</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(recentRuns?.data || []).map((run) => {
                const rid = run.run_id ?? run.id;
                const dur = run.duration_seconds ?? run.duration_sec;
                const rows = run.rows_loaded ?? run.rows_processed ?? run.records_processed;
                const stUpper = String(run.status).toUpperCase();
                return (
                  <tr key={rid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-slate-900">#{rid}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{run.pipeline_name}</td>
                    <td className="px-5 py-3 font-mono text-[11px]">{run.dataset_name}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          stUpper === 'SUCCESS' || stUpper === 'COMPLETED'
                            ? 'healthy'
                            : stUpper === 'FAILED'
                            ? 'failing'
                            : 'degraded'
                        }
                        size="sm"
                        dot
                      >
                        {stUpper}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">{dur !== null && dur !== undefined ? `${dur}s` : '—'}</td>
                    <td className="px-5 py-3">{rows !== null && rows !== undefined ? rows.toLocaleString() : '—'}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {run.started_at
                        ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/pipeline-runs?run_id=${rid}`)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {!loadingRuns && !runsError && (recentRuns?.data || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No pipeline runs recorded yet.
                  </td>
                </tr>
              )}
              {runsError && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-rose-600">
                    {runsError instanceof Error ? runsError.message : 'Failed to fetch pipeline runs'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
