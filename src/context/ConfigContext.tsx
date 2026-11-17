import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/api-client';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  timestamp: number;
}

interface ConfigContextType {
  apiUrl: string;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  backendReachable: boolean | null;
  latencyMs: number | null;
  isChecking: boolean;
  checkConnectivity: () => Promise<boolean>;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const [demoMode, setDemoModeState] = useState<boolean>(() => {
    return localStorage.getItem('datasentinel_demo_mode') === 'true';
  });

  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setDemoMode = useCallback(
    (enabled: boolean) => {
      if (enabled === demoMode) {
        return;
      }
      setDemoModeState(enabled);
      localStorage.setItem('datasentinel_demo_mode', enabled ? 'true' : 'false');
      // Clear cached queries so live and demo data never mix
      queryClient.clear();
      addToast({
        type: enabled ? 'warning' : 'info',
        title: enabled ? 'Demo Mode Enabled' : 'Live Backend Mode Active',
        message: enabled
          ? 'Displaying isolated demonstration fixtures. Backend database operations are disabled.'
          : `All requests now target live FastAPI backend at ${API_BASE_URL}.`,
      });
    },
    [demoMode, queryClient, addToast]
  );

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        setBackendReachable(true);
        setLatencyMs(duration);
        return true;
      }
      setBackendReachable(false);
      setLatencyMs(null);
      return false;
    } catch {
      setBackendReachable(false);
      setLatencyMs(null);
      return false;
    } finally {
      clearTimeout(timeoutId);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 60000);
    return () => clearInterval(interval);
  }, [checkConnectivity]);

  return (
    <ConfigContext.Provider
      value={{
        apiUrl: API_BASE_URL,
        demoMode,
        setDemoMode,
        backendReachable,
        latencyMs,
        isChecking,
        checkConnectivity,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
