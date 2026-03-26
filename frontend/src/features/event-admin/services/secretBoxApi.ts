import { api } from '@/shared/lib/api';
import type { SecretBoxTokenResponse, SecretBoxPostcardsResponse } from '../types/secretBox.types';
import type { Postcard } from '@features/postcards/types/postcards.types';

export const secretBoxApi = {
  /**
   * Get or create secret box token for an event
   */
  getSecretBoxToken: async (slug: string): Promise<{ token: string; shareUrl: string }> => {
    const response = await api.get<SecretBoxTokenResponse>(`/admin/events/${slug}/secret-box/token`);
    return {
      token: response.data.token,
      shareUrl: response.data.share_url,
    };
  },

  /**
   * Regenerate secret box token (invalidates old one)
   */
  regenerateSecretBoxToken: async (slug: string): Promise<{ token: string; shareUrl: string }> => {
    const response = await api.post<SecretBoxTokenResponse>(
      `/admin/events/${slug}/secret-box/token/regenerate`,
      {}
    );
    return {
      token: response.data.token,
      shareUrl: response.data.share_url,
    };
  },

  /**
   * Get list of secret postcards for an event
   */
  getSecretPostcards: async (slug: string): Promise<{
    postcards: Postcard[];
    total: number;
    revealed: boolean;
  }> => {
    const response = await api.get<SecretBoxPostcardsResponse>(`/admin/events/${slug}/secret-box`);
    return {
      postcards: response.data.postcards ?? [],
      total: response.data.total ?? 0,
      revealed: response.data.revealed ?? false,
    };
  },

  /**
   * Reveal the secret box (broadcasts to all connected clients)
   */
  revealSecretBox: async (slug: string): Promise<{ message: string; postcards: Postcard[] }> => {
    const response = await api.post<{ message: string; postcards: Postcard[] }>(
      `/admin/events/${slug}/reveal`,
      {}
    );
    return response.data;
  },
};
