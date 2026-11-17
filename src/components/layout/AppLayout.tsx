import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';
import { useConfig } from '../../context/ConfigContext';
import { AlertTriangle, CheckCircle2, RefreshCw, FlaskConical } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { apiUrl, backendReachable, isChecking, checkConnectivity, demoMode, setDemoMode } = useConfig();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
        {/* Top Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Explicit Demo Mode Banner */}
        {demoMode && (
          <div className="bg-purple-50 border-b border-purple-200 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-purple-900">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong className="px-1.5 py-0.5 bg-purple-200 text-purple-900 rounded mr-1.5 font-mono text-[10px]">
                  DEMO DATA
                </strong>
                You are viewing isolated demonstration fixtures. Operations do not modify the live FastAPI database.
              </span>
            </div>
            <button
              onClick={() => setDemoMode(false)}
              className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors cursor-pointer shrink-0 ml-2"
            >
              Switch to Live API
            </button>
          </div>
        )}

        {/* Live Mode: Backend Offline Alert */}
        {!demoMode && backendReachable === false && (
          <div className="bg-rose-50/90 border-b border-rose-200/80 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>FastAPI Backend Unreachable ({apiUrl}):</strong>{' '}
                Requests will fail with network errors until uvicorn is running. Mock fallback is disabled.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={() => checkConnectivity()}
                disabled={isChecking}
                className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                Retry
              </button>
              <button
                onClick={() => setDemoMode(true)}
                className="px-2.5 py-1 rounded bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 font-semibold transition-colors cursor-pointer"
              >
                Preview Demo Mode
              </button>
            </div>
          </div>
        )}

        {/* Live Connected Banner */}
        {!demoMode && backendReachable === true && (
          <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Live FastAPI Backend Connected ({apiUrl}):</strong> All requests dispatch directly to backend endpoints.
              </span>
            </div>
          </div>
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Toast Alerts */}
        <ToastContainer />
      </div>
    </div>
  );
};
