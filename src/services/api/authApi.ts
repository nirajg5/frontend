import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_USERS } from '../../mocks/fixtures';
import {
  UserResponse,
  RegisterRequest,
  TokenResponse,
  AdminTestResponse,
} from '../../types/api';

export const authApi = {
  async register(data: RegisterRequest): Promise<{ data: UserResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<UserResponse>('/auth/register', {
          method: 'POST',
          skipAuth: true,
          body: JSON.stringify({
            username: data.username,
            email: data.email,
            password: data.password,
            role: data.role || 'VIEWER',
          }),
        }),
      () => ({
        id: Date.now(),
        username: data.username,
        email: data.email,
        role: (data.role as UserResponse['role']) || 'VIEWER',
        is_active: true,
        created_at: new Date().toISOString(),
      })
    );
  },

  async login(credentials: {
    username: string;
    password: string;
  }): Promise<{ data: TokenResponse; isLive: boolean }> {
    return executeApi(
      () => {
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        return apiFetch<TokenResponse>('/auth/login', {
          method: 'POST',
          skipAuth: true,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });
      },
      () => ({
        access_token: `demo-token-${credentials.username}`,
        token_type: 'bearer',
      })
    );
  },

  async getMe(): Promise<{ data: UserResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<UserResponse>('/auth/me', { method: 'GET' }),
      () => {
        const savedRole = localStorage.getItem('datasentinel_demo_role') || 'ADMIN';
        return DEMO_USERS[savedRole] || DEMO_USERS.ADMIN;
      }
    );
  },

  async checkAdminAccess(): Promise<{ data: AdminTestResponse; isLive: boolean }> {
    return executeApi(
      () => apiFetch<AdminTestResponse>('/auth/admin-test', { method: 'GET' }),
      () => {
        const savedRole = localStorage.getItem('datasentinel_demo_role') || 'ADMIN';
        if (savedRole !== 'ADMIN') {
          throw new Error('You do not have permission for this operation.');
        }
        return {
          status: 'success',
          message: 'DEMO: Admin access verified.',
          user_role: 'ADMIN',
          timestamp: new Date().toISOString(),
        };
      }
    );
  },
};
