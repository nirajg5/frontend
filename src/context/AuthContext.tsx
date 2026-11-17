import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api/authApi';
import { UserResponse, UserRole, RegisterRequest } from '../types/api';
import { DEMO_USERS } from '../mocks/fixtures';
import { useConfig } from './ConfigContext';
import { ApiError } from '../lib/api-client';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterRequest) => Promise<void>;
  enterDemoSession: (role?: UserRole) => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { demoMode, setDemoMode } = useConfig();
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('datasentinel_token')
  );
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAuthenticatedUser = useCallback(async () => {
    setIsLoading(true);
    if (demoMode) {
      const savedRole = localStorage.getItem('datasentinel_demo_role') || 'ADMIN';
      setUser(DEMO_USERS[savedRole] || DEMO_USERS.ADMIN);
      setToken('demo-session-active');
      setIsLoading(false);
      return;
    }

    const savedToken = localStorage.getItem('datasentinel_token');
    if (!savedToken) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await authApi.getMe();
      setToken(savedToken);
      setUser(data);
    } catch (err) {
      // Clear expired/invalid token when server rejects it (401) or on failure
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('datasentinel_token');
        setToken(null);
        setUser(null);
      } else {
        // Do not fabricate an admin user if /auth/me cannot be verified
        localStorage.removeItem('datasentinel_token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadAuthenticatedUser();
  }, [loadAuthenticatedUser]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await authApi.login({ username, password });
      if (!demoMode) {
        localStorage.setItem('datasentinel_token', data.access_token);
      }
      setToken(data.access_token);
      const meRes = await authApi.getMe();
      setUser(meRes.data);
      queryClient.invalidateQueries();
    } catch (err) {
      localStorage.removeItem('datasentinel_token');
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      await authApi.register(data);
      await login(data.username, data.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('datasentinel_token');
    localStorage.removeItem('datasentinel_demo_role');
    if (demoMode) {
      setDemoMode(false);
    }
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const enterDemoSession = (role: UserRole = 'ADMIN') => {
    localStorage.setItem('datasentinel_demo_role', role);
    setDemoMode(true);
    setUser(DEMO_USERS[role] || DEMO_USERS.ADMIN);
    setToken('demo-session-active');
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        register,
        enterDemoSession,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
