import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest } from '../types/auth.types';
import { api } from '@/shared/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => boolean;
}

// Simple store without complex hydration logic
function getInitialState() {
  let user: User | null = null;
  let accessToken: string | null = null;
  let isAuthenticated = false;

  try {
    const storedUser = localStorage.getItem('auth-user');
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
    accessToken = localStorage.getItem('auth-token');
    isAuthenticated = !!accessToken;
  } catch {
    // localStorage unavailable (SSR, incognito, etc.)
  }

  return { user, accessToken, isAuthenticated };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state - read from storage on init
      user: getInitialState().user,
      accessToken: getInitialState().accessToken,
      isAuthenticated: getInitialState().isAuthenticated,
      isLoading: false,
      error: null,

      login: async (credentials, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(credentials);
          
          // Handle both snake_case and camelCase from backend
          const token = (response as any).access_token || response.accessToken;
          const refresh = (response as any).refresh_token || response.refreshToken;
          
          // Store in localStorage immediately
          try {
            localStorage.setItem('auth-token', token);
            localStorage.setItem('auth-user', JSON.stringify(response.user));
            if (rememberMe && refresh) {
              localStorage.setItem('auth-refresh', refresh);
            }
          } catch {
            // localStorage unavailable, continue anyway
          }
          
          set({
            user: response.user,
            accessToken: token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.register(data);
          
          // Handle both snake_case and camelCase from backend
          const token = (response as any).access_token || response.accessToken;
          const refresh = (response as any).refresh_token || response.refreshToken;
          
          // Store in localStorage immediately
          try {
            localStorage.setItem('auth-token', token);
            localStorage.setItem('auth-user', JSON.stringify(response.user));
            localStorage.setItem('auth-refresh', refresh);
          } catch {
            // localStorage unavailable, continue anyway
          }
          
          set({
            user: response.user,
            accessToken: token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        try {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-user');
          localStorage.removeItem('auth-refresh');
        } catch {
          // localStorage unavailable
        }
        
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
      
      checkAuth: () => {
        try {
          const token = localStorage.getItem('auth-token');
          return !!token;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: () => ({}), // We handle storage manually for immediate persistence
    }
  )
);
