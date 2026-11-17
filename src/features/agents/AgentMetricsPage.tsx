import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../../services/api/agentsApi';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Bot,
  Zap,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
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

export const AgentMetricsPage: React.FC = () => {
  const { isAdmin, user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agentMetrics'],
    queryFn: () => agentsApi.getMetrics(),
    enabled: isAdmin,
    retry: 0,
  });

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">ADMIN Authorization Required</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          The <code>GET /agent/metrics</code> endpoint requires <strong>ADMIN</strong> permission. Your current role is{' '}
          <strong className="font-mono">{user?.role}</strong>.
        </p>
      </div>
    );
  }

  const metrics = data?.data;
  const avgDuration = metrics?.avg_duration_seconds ?? metrics?.avg_duration_sec;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Agent Metrics (ADMIN)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational metrics for LangGraph agent investigations (GET /agent/metrics)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Metrics
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error instanceof Error ? error.message : 'Failed to load agent metrics.'}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          Loading agent metrics...
        </div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Investigations"
              value={metrics.total_investigations}
              icon={<Bot className="w-4 h-4" />}
              status="neutral"
            />
            {metrics.completed_investigations !== undefined && (
              <StatCard
                title="Completed"
                value={metrics.completed_investigations}
                icon={<ShieldCheck className="w-4 h-4" />}
                status="healthy"
              />
            )}
            {avgDuration !== undefined && (
              <StatCard
                title="Avg Duration"
                value={`${avgDuration}s`}
                icon={<Clock className="w-4 h-4" />}
              />
            )}
            {metrics.success_rate !== undefined && (
              <StatCard
                title="Success Rate"
                value={`${metrics.success_rate}%`}
                icon={<Zap className="w-4 h-4" />}
                status="healthy"
              />
            )}
          </div>

          {metrics.agent_types && metrics.agent_types.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Execution Duration by Agent Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.agent_types}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="role" stroke="#94a3b8" fontSize={10} interval={0} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="avg_time_sec" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Seconds" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Role Breakdown</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Executions</th>
                        <th className="px-5 py-3">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.agent_types.map((agent, i) => (
                        <tr key={i}>
                          <td className="px-5 py-3 font-semibold text-slate-900">{agent.role}</td>
                          <td className="px-5 py-3 font-mono">{agent.executions}</td>
                          <td className="px-5 py-3 font-mono">{agent.avg_time_sec}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Raw Metrics Payload</CardTitle>
              <Badge variant="info" size="sm">ADMIN</Badge>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                {JSON.stringify(metrics, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};
