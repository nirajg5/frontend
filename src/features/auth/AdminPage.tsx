import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../services/api/authApi';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Server,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAccessCheck', user?.username, user?.role],
    queryFn: () => authApi.checkAdminAccess(),
    retry: 0,
  });

  const adminResponse = data?.data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Administration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Restricted administrative controls and permission gate verification (GET /auth/admin-test)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Re-verify Access
        </Button>
      </div>

      {/* Admin Test Verification Result */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <CardTitle>Administrative Gate Verification (GET /auth/admin-test)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Verifying administrative role claims with FastAPI backend...
            </div>
          ) : error || !isAdmin ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Administrative Access Denied</span>
              </div>
              <p className="text-rose-700 leading-relaxed">
                {error instanceof Error
                  ? error.message
                  : `Your current role (${user?.role}) does not satisfy ADMIN authorization required for /auth/admin-test.`}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Administrative Clearance Verified</span>
                </div>
                <Badge variant="healthy" size="sm">
                  {String(adminResponse?.status || 'AUTHORIZED').toUpperCase()}
                </Badge>
              </div>

              {adminResponse?.message && (
                <p className="text-emerald-800 text-xs leading-relaxed">{adminResponse.message}</p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-emerald-900 border-t border-emerald-200/80">
                <div>
                  <span className="text-emerald-700 uppercase font-semibold text-[10px]">Verified Role</span>
                  <p className="font-bold font-mono">
                    {adminResponse?.user_role || adminResponse?.role || user?.role}
                  </p>
                </div>
                <div>
                  <span className="text-emerald-700 uppercase font-semibold text-[10px]">Authenticated User</span>
                  <p className="font-mono">{adminResponse?.user || user?.username}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-700" />
              <CardTitle>Worker Maintenance Endpoints</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Celery workers and LangGraph agent tasks are backed by Redis. Stale investigations can be recovered from the Agent Investigations page using:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-indigo-700">
              POST /agent/maintenance/recover-stale?timeout_minutes=30
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-700" />
              <CardTitle>Configured Service Ports</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">React + Vite Frontend:</span>
              <span className="font-mono font-semibold text-slate-800">http://localhost:3000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">FastAPI Backend:</span>
              <span className="font-mono font-semibold text-slate-800">http://127.0.0.1:8000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">PostgreSQL Host Port:</span>
              <span className="font-mono font-semibold text-slate-800">localhost:5433</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Redis Broker:</span>
              <span className="font-mono font-semibold text-slate-800">localhost:6379</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
