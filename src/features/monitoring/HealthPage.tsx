import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../../services/api/healthApi';
import { metricsApi } from '../../services/api/metricsApi';
import { ApiError } from '../../lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { useConfig } from '../../context/ConfigContext';
import {
  HeartPulse,
  Database,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

export const HealthPage: React.FC = () => {
  const { addToast, apiUrl, demoMode, latencyMs, checkConnectivity } = useConfig();
  const [activeTab, setActiveTab] = useState<'health' | 'metrics'>('health');
  const [copied, setCopied] = useState(false);

  // Queries
  const {
    data: rootData,
    isLoading: rootLoading,
    error: rootError,
    refetch: refetchRoot,
  } = useQuery({
    queryKey: ['systemRoot', demoMode],
    queryFn: () => healthApi.getRoot(),
    retry: 0,
  });

  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['apiHealth', demoMode],
    queryFn: () => healthApi.getHealth(),
    retry: 0,
  });

  const {
    data: dbData,
    isLoading: dbLoading,
    error: dbError,
    refetch: refetchDb,
  } = useQuery({
    queryKey: ['dbHealthDetail', demoMode],
    queryFn: () => healthApi.getDatabaseHealth(),
    retry: 0,
  });

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['prometheusMetrics', demoMode],
    queryFn: () => metricsApi.getMetricsRaw(),
    retry: 0,
  });

  const root = rootData?.data;
  const health = healthData?.data;
  const dbHealth = dbData?.data;
  const metrics = metricsData;

  const dbApiError = dbError instanceof ApiError ? dbError : null;
  const isDb503 = dbApiError?.status === 503;
  const isDbConnected =
    !dbError &&
    dbHealth &&
    ['connected', 'healthy', 'ok'].includes(String(dbHealth.status).toLowerCase());

  const handleCopyRaw = () => {
    if (metrics?.raw) {
      navigator.clipboard.writeText(metrics.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: 'info',
        title: 'Copied to Clipboard',
        message: 'Prometheus raw exposition text copied.',
      });
    }
  };

  const handleRefreshAll = () => {
    checkConnectivity();
    refetchRoot();
    refetchHealth();
    refetchDb();
    refetchMetrics();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              System Health &amp; Diagnostics
            </h2>
            {demoMode && <Badge variant="mock">DEMO DATA</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Separate status probes for FastAPI core (<code>GET /</code>, <code>GET /health</code>), PostgreSQL (<code>GET /health/database</code>), and Prometheus (<code>GET /metrics</code>)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Ping All Services
        </Button>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'health' | 'metrics')}
        tabs={[
          {
            id: 'health',
            label: 'Service & Database Health',
            icon: <HeartPulse className="w-4 h-4" />,
          },
          {
            id: 'metrics',
            label: 'Prometheus Metrics (GET /metrics)',
            icon: <Activity className="w-4 h-4" />,
          },
        ]}
      />

      {activeTab === 'health' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Core Application Identity (GET /) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <CardTitle>Core Identity (GET /)</CardTitle>
                </div>
                {rootLoading ? (
                  <Badge variant="neutral" size="sm">CHECKING</Badge>
                ) : rootError ? (
                  <Badge variant="failing" size="sm" dot>UNREACHABLE</Badge>
                ) : (
                  <Badge variant="healthy" size="sm" dot>
                    {String(root?.status || 'ONLINE').toUpperCase()}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {rootError ? (
                  <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Core Endpoint Unreachable
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      {rootError instanceof Error ? rootError.message : 'Unable to reach GET /.'}
                    </p>
                  </div>
                ) : rootLoading ? (
                  <p className="text-slate-400">Probing {apiUrl}/ ...</p>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Service Name
                      </span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {root?.app_name || root?.name || root?.message || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        API Version
                      </span>
                      <p className="font-mono text-slate-800 mt-0.5">{root?.version || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Swagger / OpenAPI Docs
                      </span>
                      <a
                        href={root?.docs_url || `${apiUrl}/docs`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-indigo-600 hover:underline block mt-0.5 truncate"
                      >
                        {root?.docs_url || `${apiUrl}/docs`}
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* FastAPI Service Health (GET /health) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  <CardTitle>API Runtime (GET /health)</CardTitle>
                </div>
                {healthLoading ? (
                  <Badge variant="neutral" size="sm">CHECKING</Badge>
                ) : healthError ? (
                  <Badge variant="failing" size="sm" dot>OFFLINE</Badge>
                ) : (
                  <Badge
                    variant={
                      String(health?.status).toLowerCase() === 'healthy' ? 'healthy' : 'degraded'
                    }
                    size="sm"
                    dot
                  >
                    {String(health?.status || 'UNKNOWN').toUpperCase()}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {healthError ? (
                  <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      API Health Probe Failed
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      {healthError instanceof Error
                        ? healthError.message
                        : 'FastAPI /health did not respond.'}
                    </p>
                  </div>
                ) : healthLoading ? (
                  <p className="text-slate-400">Probing {apiUrl}/health ...</p>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Reported Status
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {health?.status || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        HTTP Roundtrip Latency
                      </span>
                      <p className="font-mono text-slate-800 mt-0.5">
                        {latencyMs !== null ? `${latencyMs} ms` : '—'}
                      </p>
                    </div>
                    {health?.uptime_sec !== undefined && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Process Uptime
                        </span>
                        <p className="font-mono text-slate-800 mt-0.5">
                          {Math.floor(health.uptime_sec / 3600)}h{' '}
                          {Math.floor((health.uptime_sec % 3600) / 60)}m
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Probe Timestamp
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Database Health (GET /health/database) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <CardTitle>Database (GET /health/database)</CardTitle>
                </div>
                {dbLoading ? (
                  <Badge variant="neutral" size="sm">CHECKING</Badge>
                ) : isDbConnected ? (
                  <Badge variant="healthy" size="sm" dot>
                    {String(dbHealth?.status).toUpperCase()}
                  </Badge>
                ) : isDb503 ? (
                  <Badge variant="failing" size="sm" dot>UNHEALTHY (503)</Badge>
                ) : (
                  <Badge variant="failing" size="sm" dot>
                    {dbError ? 'DISCONNECTED' : String(dbHealth?.status || 'UNHEALTHY').toUpperCase()}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {dbLoading ? (
                  <p className="text-slate-400">Checking PostgreSQL connectivity...</p>
                ) : isDbConnected && dbHealth ? (
                  <>
                    {dbHealth.database && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Engine / Target
                        </span>
                        <p className="font-semibold text-slate-900 mt-0.5">{dbHealth.database}</p>
                      </div>
                    )}
                    {dbHealth.latency_ms !== undefined && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Postgres Roundtrip
                        </span>
                        <p className="font-bold text-emerald-600 mt-0.5">
                          {dbHealth.latency_ms} ms
                        </p>
                      </div>
                    )}
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px]">
                      PostgreSQL connection verified via backend health check.
                    </div>
                  </>
                ) : (
                  <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {isDb503
                        ? 'HTTP 503: PostgreSQL Unhealthy / Unreachable'
                        : 'Database Health Check Failed'}
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      {dbError instanceof Error
                        ? dbError.message
                        : dbHealth?.error ||
                          dbHealth?.detail ||
                          'Database connection is unhealthy or PostgreSQL is not running.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Prometheus Metrics View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Parsed Prometheus Metrics</h4>
              <p className="text-xs text-slate-500">
                Text exposition endpoint <code>GET /metrics</code>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyRaw}
              disabled={!metrics?.raw}
              leftIcon={
                copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
            >
              {copied ? 'Copied' : 'Copy Raw Output'}
            </Button>
          </div>

          {metricsError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {metricsError instanceof Error
                  ? metricsError.message
                  : 'Failed to retrieve /metrics exposition output.'}
              </span>
            </div>
          )}

          {metricsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Scraping /metrics...
            </div>
          ) : metrics ? (
            <>
              {metrics.parsed.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  No metrics parsed from exposition payload.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.parsed.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 truncate" title={m.name}>
                          {m.name}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {m.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{m.help}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {m.labels ? (
                          <span className="font-mono text-[10px] text-indigo-600 truncate max-w-[160px]">
                            {JSON.stringify(m.labels).replace(/[{""}]/g, '')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Unlabeled</span>
                        )}
                        <span className="text-base font-extrabold text-slate-900">{m.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-600" />
                    <CardTitle>Raw Exposition Output (/metrics)</CardTitle>
                  </div>
                </CardHeader>
                <pre className="p-4 bg-slate-950 text-slate-200 text-xs font-mono leading-relaxed overflow-x-auto max-h-72 scrollbar-thin">
                  {metrics.raw}
                </pre>
              </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
