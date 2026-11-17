import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { Menu, RefreshCw, LogOut, Server } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { backendReachable, latencyMs, isChecking, checkConnectivity, demoMode, setDemoMode } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = (pathname: string): { title: string; category: string } => {
    switch (pathname) {
      case '/':
        return { title: 'Enterprise Observability Overview', category: 'Dashboard' };
      case '/datasets':
        return { title: 'Dataset Catalog & Registration', category: 'Data Platform' };
      case '/ingestion':
        return { title: 'CSV Ingestion Pipeline', category: 'Data Platform' };
      case '/etl':
        return { title: 'Silver & Gold ETL Operations', category: 'Data Platform' };
      case '/pipeline-runs':
        return { title: 'Pipeline Execution Runs', category: 'Data Platform' };
      case '/quality':
        return { title: 'Data Quality Monitoring', category: 'Reliability' };
      case '/freshness':
        return { title: 'Freshness SLA Monitoring', category: 'Reliability' };
      case '/reliability':
        return { title: 'Reliability Scoring', category: 'Reliability' };
      case '/incidents':
        return { title: 'Incident Management & Triage', category: 'Reliability' };
      case '/predictions':
        return { title: 'Pipeline Failure Predictions', category: 'Observability' };
      case '/ai-analysis':
        return { title: 'AI Root Cause Analysis', category: 'Intelligence' };
      case '/rag':
        return { title: 'RAG Knowledge Assistant', category: 'Intelligence' };
      case '/agents':
        return { title: 'LangGraph Agent Investigations', category: 'Intelligence' };
      case '/agent-metrics':
        return { title: 'Agent Performance & Metrics', category: 'Intelligence' };
      case '/health':
        return { title: 'System Health & Diagnostics', category: 'Operations' };
      case '/profile':
        return { title: 'User Profile & Permissions', category: 'Account' };
      case '/admin':
        return { title: 'Administration & Access Control', category: 'Operations' };
      default:
        return { title: 'DataSentinel Platform', category: 'Platform' };
    }
  };

  const pageInfo = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>{pageInfo.category}</span>
            <span>/</span>
            <span className="text-indigo-600">{pageInfo.title.split(' ')[0]}</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight hidden sm:block">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend Connectivity Status & Ping */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
          <Server className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-700">FastAPI:</span>
          {backendReachable === null || isChecking ? (
            <Badge variant="neutral" size="sm" dot>
              Checking...
            </Badge>
          ) : backendReachable ? (
            <Badge variant="healthy" size="sm" dot>
              Connected {latencyMs ? `(${latencyMs}ms)` : ''}
            </Badge>
          ) : (
            <Badge variant="failing" size="sm" dot>
              Unreachable
            </Badge>
          )}

          <button
            onClick={() => checkConnectivity()}
            disabled={isChecking}
            title="Recheck FastAPI Backend Connectivity"
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors ml-0.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        {/* Explicit Live vs Demo Mode Selector */}
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
          <button
            onClick={() => setDemoMode(false)}
            className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
              !demoMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Connect directly to FastAPI backend (default)"
          >
            Live API
          </button>
          <button
            onClick={() => setDemoMode(true)}
            className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
              demoMode
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Explicitly preview isolated DEMO DATA fixtures"
          >
            Demo Mode
          </button>
        </div>

        {/* Authenticated User Role Badge & Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          {user?.role && (
            <Badge
              variant={user.role === 'ADMIN' ? 'info' : 'neutral'}
              size="sm"
              className="hidden sm:inline-flex font-mono"
            >
              {user.role}
            </Badge>
          )}

          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="View User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user?.username}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
