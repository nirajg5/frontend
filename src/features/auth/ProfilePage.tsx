import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Shield, Key, Copy, Check, CheckCircle2, FlaskConical } from 'lucide-react';
import { UserRole } from '../../types/api';

export const ProfilePage: React.FC = () => {
  const { user, token, enterDemoSession } = useAuth();
  const { addToast, demoMode } = useConfig();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: 'info',
        title: 'Token Copied',
        message: 'JWT Bearer token copied to clipboard.',
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="critical">ADMIN</Badge>;
      case 'DATA_ENGINEER':
        return <Badge variant="info">DATA_ENGINEER</Badge>;
      case 'DATA_ANALYST':
        return <Badge variant="healthy">DATA_ANALYST</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Profile &amp; Role Permissions</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Authenticated identity retrieved from GET /auth/me
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="lg:col-span-1">
          <CardContent className="text-center pt-8 pb-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{user?.username}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
            </div>

            <div className="pt-2">{user?.role && getRoleBadge(user.role)}</div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2 mt-4">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-slate-800 font-semibold">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {user?.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {user?.created_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Created:</span>
                  <span className="text-slate-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roles & Permissions Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
              </div>
              <p className="text-xs text-slate-500">Enforced server-side by FastAPI dependencies</p>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Endpoint authorization is verified strictly on the FastAPI backend via JWT Bearer claims.
                Your assigned role is <strong>{user?.role}</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-900 font-mono">ADMIN</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Full access including /auth/admin-test, /agent/metrics, and /agent/maintenance/recover-stale.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-900 font-mono">DATA_ENGINEER</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dataset registration, CSV ingestion, Silver/Gold ETL, quality checks, and failure predictions.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-900 font-mono">DATA_ANALYST</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Incident inspection, RAG assistant queries, AI root-cause analysis, and SLA reports.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-900 font-mono">VIEWER</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Read-only access to datasets, pipeline runs, and system health metrics.
                  </p>
                </div>
              </div>

              {demoMode && (
                <div className="p-3 rounded-xl border border-purple-200 bg-purple-50 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-purple-900">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    DEMO MODE ONLY: Preview Persona
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['ADMIN', 'DATA_ENGINEER', 'DATA_ANALYST'] as UserRole[]).map((r) => (
                      <Button
                        key={r}
                        variant={user?.role === r ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => enterDemoSession(r)}
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token Inspector */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-600" />
                <CardTitle>Session JWT Bearer Token</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToken}
                leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy Token'}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-slate-950 text-slate-300 rounded-xl font-mono text-[11px] overflow-x-auto break-all">
                {token || 'No active token'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
