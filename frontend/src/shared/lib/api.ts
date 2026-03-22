import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios';
import type { Postcard, SecretBoxStatus } from '@features/postcards/types/postcards.types';
import type { QuizQuestion, CreateQuestionRequest, UpdateQuestionRequest, ReorderUpdate } from '@features/admin/types/questions.types';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '@features/auth/types/auth.types';

// Tipos de datos que vienen del backend
export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  created_at: string;
}

export interface RankingEntry {
  position: number;
  player: Player;
}

export interface CreatePlayerRequest {
  name: string;
  avatar?: string;
}

export interface SubmitQuizRequest {
  favorites: Record<string, string>;
  preferences: Record<string, string>;
  description: string;
}

export interface SubmitQuizResponse {
  score: number;
  message: string;
}

// Event types for multi-event support
export interface EventFeatures {
  quiz: boolean;
  corkboard: boolean;
  secretBox: boolean;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  description?: string;
  date?: string;
  owner_id?: string;
  theme_id?: string;
  features: EventFeatures;
  is_active: boolean;
}

// Cliente API
const PLAYER_ID_KEY = 'mile-game-player-id';

class ApiClient {
  private client: AxiosInstance;
  private playerId: string | null = null;

  constructor() {
    // URL del backend (desde variables de entorno o default)
    const baseURL = import.meta.env.VITE_API_URL || '/api';

    // Recuperar playerId de localStorage (sobrevive refresh/memory pressure)
    try {
      this.playerId = localStorage.getItem(PLAYER_ID_KEY);
    } catch {
      // localStorage puede no estar disponible (incognito, etc.)
      this.playerId = null;
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 segundos timeout
    });

    // Request interceptor - add auth header
    this.client.interceptors.request.use(
      (config) => {
        // Read token directly from localStorage for reliability
        try {
          const token = localStorage.getItem('auth-token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch {
          // localStorage unavailable (SSR, incognito, etc.)
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; headers?: Record<string, string> };
        
        // If 401 and haven't tried refresh yet, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem('auth-refresh');
            if (refreshToken) {
              console.log('Token expired, attempting refresh...');
              const tokens = await this.refreshToken(refreshToken);
              
              // Store new tokens
              localStorage.setItem('auth-token', tokens.accessToken);
              localStorage.setItem('auth-refresh', tokens.refreshToken);
              
              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.warn('Token refresh failed, redirecting to login...');
            // Refresh failed, clear auth and redirect
            try {
              localStorage.removeItem('auth-token');
              localStorage.removeItem('auth-refresh');
              localStorage.removeItem('auth-user');
            } catch {
              // localStorage unavailable
            }
            // Use replace to avoid history stack buildup
            window.location.replace('/login');
            return Promise.reject(refreshError);
          }
        }
        
        // If 401 and already retried or no refresh token, clear auth
        if (error.response?.status === 401) {
          try {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-refresh');
            localStorage.removeItem('auth-user');
          } catch {
            // localStorage unavailable
          }
          window.location.replace('/login');
        }
        return Promise.reject(error);
      }
    );

    // Interceptor para manejar errores
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Status:', error.response.status);
        }
        return Promise.reject(error);
      }
    );
  }

  // Guardar player ID para requests posteriores (persiste en localStorage)
  setPlayerId(id: string) {
    this.playerId = id;
    try {
      localStorage.setItem(PLAYER_ID_KEY, id);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  clearPlayerId() {
    this.playerId = null;
    try {
      localStorage.removeItem(PLAYER_ID_KEY);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  // ==========================================
  // Auth
  // ==========================================

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.client.post<RegisterResponse>('/auth/register', data);
    return response.data;
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.client.post('/auth/refresh', { refreshToken: token });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<{ user_id: string; email: string }>('/auth/me');
    // Transform backend response { user_id, email } to User type
    return {
      id: response.data.user_id,
      email: response.data.email,
      name: '', // Backend doesn't return name in /auth/me
      createdAt: '',
      updatedAt: '',
    };
  }

  // ==========================================
  // Players
  // ==========================================

  async createPlayer(data: CreatePlayerRequest): Promise<Player> {
    const response = await this.client.post<Player>('/players', data);
    // Auto-guardar el ID del jugador creado
    this.setPlayerId(response.data.id);
    return response.data;
  }

  async getPlayer(id: string): Promise<Player> {
    const response = await this.client.get<Player>(`/players/${id}`);
    return response.data;
  }

  async listPlayers(): Promise<Player[]> {
    const response = await this.client.get<Player[]>('/players');
    return response.data;
  }

  // ==========================================
  // Quiz
  // ==========================================

  async submitQuiz(data: SubmitQuizRequest): Promise<SubmitQuizResponse> {
    if (!this.playerId) {
      throw new Error('No player ID set. Call createPlayer first.');
    }

    const response = await this.client.post<SubmitQuizResponse>(
      '/quiz/submit',
      data,
      {
        headers: {
          'X-Player-ID': this.playerId,
        },
      }
    );
    return response.data;
  }

  // ==========================================
  // Ranking
  // ==========================================

  async getRanking(): Promise<RankingEntry[]> {
    const response = await this.client.get<RankingEntry[]>('/ranking');
    return response.data;
  }

  // ==========================================
  // Postcards (Cartelera de Corcho)
  // ==========================================

  async createPostcard(file: File, message: string, senderName?: string): Promise<Postcard> {
    let effectivePlayerId = this.playerId;

    // Auto-registro: si no hay jugador y se provee nombre, registrar como invitado
    // antes de crear la postal. Mismo flujo que Secret Box pero desde el cliente.
    if (!effectivePlayerId) {
      const name = senderName?.trim();
      if (!name) {
        throw new Error('Se requiere un nombre para agregar una postal sin estar registrado.');
      }
      // Registrar como invitado con avatar de cámara
      await this.createPlayer({ name, avatar: '📸' });
      effectivePlayerId = this.playerId; // createPlayer ya lo setea vía setPlayerId
    }

    if (!effectivePlayerId) {
      throw new Error('No se pudo obtener un player ID.');
    }

    const formData = new FormData();
    // Usar "media" para videos, "image" para imágenes (compatibilidad hacia atrás)
    const fieldName = file.type.startsWith('video/') ? 'media' : 'image';
    formData.append(fieldName, file);
    formData.append('message', message);
    if (senderName?.trim()) {
      formData.append('sender_name', senderName.trim());
    }

    const response = await this.client.post<Postcard>(
      '/postcards',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Player-ID': effectivePlayerId,
        },
        timeout: 30000, // 30s para uploads
      }
    );
    return response.data;
  }

  async createSecretPostcard(file: File, message: string, senderName: string, token: string): Promise<Postcard> {
    const formData = new FormData();
    // Usar "media" para videos, "image" para imágenes (compatibilidad hacia atrás)
    const fieldName = file.type.startsWith('video/') ? 'media' : 'image';
    formData.append(fieldName, file);
    formData.append('message', message);
    formData.append('sender_name', senderName.trim());

    const response = await this.client.post<Postcard>(
      '/postcards/secret',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Secret-Token': token,
        },
        timeout: 30000,
      }
    );
    return response.data;
  }

  async listPostcards(): Promise<Postcard[]> {
    const response = await this.client.get<Postcard[]>('/postcards');
    return response.data;
  }

  async getDescriptions(): Promise<string[]> {
    const response = await this.client.get<{ descriptions: string[] }>('/quiz/descriptions');
    return response.data.descriptions ?? [];
  }

  // ==========================================
  // Admin — Secret Box
  // ==========================================

  async getSecretBoxStatus(): Promise<SecretBoxStatus> {
    const response = await this.client.get<SecretBoxStatus>('/admin/status');
    return response.data;
  }

  async listSecretPostcards(): Promise<Postcard[]> {
    const response = await this.client.get<Postcard[]>('/admin/secret-box');
    return response.data;
  }

  async revealSecretBox(): Promise<{ message: string; postcards: Postcard[] }> {
    const response = await this.client.post<{ message: string; postcards: Postcard[] }>(
      '/admin/reveal',
      {}
    );
    return response.data;
  }

  // ==========================================
  // Health Check
  // ==========================================

  async healthCheck(): Promise<{ status: string }> {
    // Health check está en la raíz, no en /api
    const baseURL = import.meta.env.VITE_API_URL || '';
    const response = await axios.get(`${baseURL}/health`);
    return response.data;
  }

  // ==========================================
  // Events (Multi-event support)
  // ==========================================

  // Get events owned by the current user
  async getUserEvents(): Promise<Event[]> {
    const response = await this.client.get<Event[]>('/users/me/events');
    return response.data;
  }

  // Create a new event
  async createEvent(data: {
    name: string;
    slug: string;
    date?: string;
    description?: string;
    features?: EventFeatures;
  }): Promise<Event> {
    // Transform camelCase to snake_case for backend compatibility
    const payload: Record<string, unknown> = {
      name: data.name,
      slug: data.slug,
      description: data.description || '',
    };
    
    if (data.date) {
      payload.starts_at = data.date;
    }
    
    if (data.features) {
      payload.features = {
        quiz: data.features.quiz,
        corkboard: data.features.corkboard,
        secretBox: data.features.secretBox,  // camelCase para coincidir con backend
      };
    }
    
    const response = await this.client.post<Event>('/events', payload);
    return response.data;
  }

  async getEventBySlug(slug: string): Promise<Event> {
    const response = await this.client.get<Event>(`/events/${slug}`);
    return response.data;
  }

  // Create player scoped to an event
  async createPlayerScoped(eventSlug: string, data: CreatePlayerRequest): Promise<Player> {
    const response = await this.client.post<Player>(`/events/${eventSlug}/players`, data);
    this.setPlayerId(response.data.id);
    return response.data;
  }

  // Submit quiz for a specific event
  async submitQuizScoped(eventSlug: string, data: SubmitQuizRequest): Promise<SubmitQuizResponse> {
    if (!this.playerId) {
      throw new Error('No player ID set. Call createPlayer first.');
    }

    const response = await this.client.post<SubmitQuizResponse>(
      `/events/${eventSlug}/quiz/submit`,
      data,
      {
        headers: {
          'X-Player-ID': this.playerId,
        },
      }
    );
    return response.data;
  }

  // Get ranking for a specific event
  async getRankingScoped(eventSlug: string): Promise<RankingEntry[]> {
    const response = await this.client.get<RankingEntry[]>(`/events/${eventSlug}/ranking`);
    return response.data;
  }

  // Create postcard for a specific event (with inline player registration)
  async createPostcardScoped(
    eventSlug: string, 
    file: File, 
    message: string, 
    options?: { senderName?: string; name?: string; avatar?: string }
  ): Promise<Postcard> {
    let effectivePlayerId = this.playerId;

    // Auto-registro: si no hay jugador y se provee name+avatar, registrar como invitado
    if (!effectivePlayerId && options?.name && options?.avatar) {
      const player = await this.createPlayerScoped(eventSlug, {
        name: options.name,
        avatar: options.avatar,
      });
      effectivePlayerId = player.id;
    }

    // Si sigue sin haber player, intentar con senderName como fallback
    if (!effectivePlayerId && options?.senderName) {
      const player = await this.createPlayerScoped(eventSlug, {
        name: options.senderName,
        avatar: '📸',
      });
      effectivePlayerId = player.id;
    }

    if (!effectivePlayerId) {
      throw new Error('Se requiere un nombre para agregar una postal sin estar registrado.');
    }

    const formData = new FormData();
    // Usar "media" para videos, "image" para imágenes (compatibilidad hacia atrás)
    const fieldName = file.type.startsWith('video/') ? 'media' : 'image';
    formData.append(fieldName, file);
    formData.append('message', message);
    if (options?.senderName) {
      formData.append('sender_name', options.senderName.trim());
    }
    if (options?.name) {
      formData.append('name', options.name);
    }
    if (options?.avatar) {
      formData.append('avatar', options.avatar);
    }

    const response = await this.client.post<Postcard>(
      `/events/${eventSlug}/postcards`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Player-ID': effectivePlayerId,
        },
        timeout: 30000,
      }
    );
    return response.data;
  }

  // List postcards for a specific event
  async listPostcardsScoped(eventSlug: string): Promise<Postcard[]> {
    const response = await this.client.get<Postcard[]>(`/events/${eventSlug}/postcards`);
    return response.data;
  }

  // ==========================================
  // Admin — Event Features
  // ==========================================

  async updateEventFeatures(eventSlug: string, features: EventFeatures): Promise<Event> {
    // Transform camelCase to snake_case for backend compatibility
    const snakeFeatures = {
      quiz: features.quiz,
      corkboard: features.corkboard,
      secretBox: features.secretBox,  // camelCase para coincidir con backend
    };
    
    const response = await this.client.put<Event>(
      `/admin/events/${eventSlug}/features`,
      { features: snakeFeatures }
    );
    return response.data;
  }

  // ==========================================
  // Admin — Questions
  // ==========================================

  async listQuestions(eventSlug: string): Promise<QuizQuestion[]> {
    const response = await this.client.get<QuizQuestion[]>(`/admin/events/${eventSlug}/questions`);
    return response.data;
  }

  async createQuestion(eventSlug: string, data: CreateQuestionRequest): Promise<QuizQuestion> {
    const response = await this.client.post<QuizQuestion>(`/admin/events/${eventSlug}/questions`, data);
    return response.data;
  }

  async updateQuestion(questionId: string, data: UpdateQuestionRequest): Promise<QuizQuestion> {
    const response = await this.client.put<QuizQuestion>(`/admin/questions/${questionId}`, data);
    return response.data;
  }

  async deleteQuestion(questionId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/admin/questions/${questionId}`);
    return response.data;
  }

  async reorderQuestions(eventSlug: string, orders: ReorderUpdate[]): Promise<{ message: string }> {
    const response = await this.client.patch<{ message: string }>(
      `/admin/events/${eventSlug}/questions/reorder`,
      { orders }
    );
    return response.data;
  }

  async exportQuestions(eventSlug: string): Promise<QuizQuestion[]> {
    const response = await this.client.get<QuizQuestion[]>(`/admin/events/${eventSlug}/questions/export`);
    return response.data;
  }

  async importQuestions(eventSlug: string, questions: CreateQuestionRequest[]): Promise<{ imported: number; warnings?: string[] }> {
    const response = await this.client.post<{ imported: number; warnings?: string[] }>(
      `/admin/events/${eventSlug}/questions/import`,
      { questions }
    );
    return response.data;
  }

  // ==========================================
  // Generic HTTP methods for flexible API calls
  // ==========================================

  async get<T>(url: string, config?: Parameters<AxiosInstance['get']>[1]): Promise<{ data: T }> {
    const response = await this.client.get<T>(url, config);
    return { data: response.data };
  }

  async post<T>(url: string, data?: unknown, config?: Parameters<AxiosInstance['post']>[2]): Promise<{ data: T }> {
    const response = await this.client.post<T>(url, data, config);
    return { data: response.data };
  }

  async put<T>(url: string, data?: unknown, config?: Parameters<AxiosInstance['put']>[2]): Promise<{ data: T }> {
    const response = await this.client.put<T>(url, data, config);
    return { data: response.data };
  }

  async delete<T>(url: string, config?: Parameters<AxiosInstance['delete']>[1]): Promise<{ data: T }> {
    const response = await this.client.delete<T>(url, config);
    return { data: response.data };
  }
}

// Exportar singleton
export const api = new ApiClient();
