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
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state - read from storage on init
      user: JSON.parse(localStorage.getItem('auth-user') || 'null'),
      accessToken: localStorage.getItem('auth-token'),
      isAuthenticated: !!localStorage.getItem('auth-token'),
      isLoading: false,
      error: null,

      login: async (credentials, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(credentials);
          
          // Store in localStorage immediately
          localStorage.setItem('auth-token', response.accessToken);
          localStorage.setItem('auth-user', JSON.stringify(response.user));
          
          if (rememberMe && response.refreshToken) {
            localStorage.setItem('auth-refresh', response.refreshToken);
          }
          
          set({
            user: response.user,
            accessToken: response.accessToken,
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
          
          // Store in localStorage immediately
          localStorage.setItem('auth-token', response.accessToken);
          localStorage.setItem('auth-user', JSON.stringify(response.user));
          localStorage.setItem('auth-refresh', response.refreshToken);
          
          set({
            user: response.user,
            accessToken: response.accessToken,
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
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
        localStorage.removeItem('auth-refresh');
        
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
      
      checkAuth: () => {
        const token = localStorage.getItem('auth-token');
        return !!token;
      },
    }),
    {
      name: 'auth-store',
      partialize: () => ({}), // We handle storage manually for immediate persistence
    }
  )
);
