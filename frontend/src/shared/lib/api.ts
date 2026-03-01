import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { Postcard, SecretBoxStatus } from '@features/postcards/types/postcards.types';

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

  async createPostcard(image: File, message: string, senderName?: string): Promise<Postcard> {
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
    formData.append('image', image);
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

  async createSecretPostcard(image: File, message: string, senderName: string, token: string): Promise<Postcard> {
    const formData = new FormData();
    formData.append('image', image);
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

  async getSecretBoxStatus(adminKey: string): Promise<SecretBoxStatus> {
    const response = await this.client.get<SecretBoxStatus>('/admin/status', {
      headers: { 'X-Admin-Key': adminKey },
    });
    return response.data;
  }

  async listSecretPostcards(adminKey: string): Promise<Postcard[]> {
    const response = await this.client.get<Postcard[]>('/admin/secret-box', {
      headers: { 'X-Admin-Key': adminKey },
    });
    return response.data;
  }

  async revealSecretBox(adminKey: string): Promise<{ message: string; postcards: Postcard[] }> {
    const response = await this.client.post<{ message: string; postcards: Postcard[] }>(
      '/admin/reveal',
      {},
      { headers: { 'X-Admin-Key': adminKey } }
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
}

// Exportar singleton
export const api = new ApiClient();
