import { create } from 'zustand';
import type { Postcard } from '../types/postcards.types';

export interface PostcardState {
  postcards: Postcard[];
  isLoading: boolean;
  error: string | null;

  setPostcards: (postcards: Postcard[]) => void;
  addPostcard: (postcard: Postcard) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePostcardStore = create<PostcardState>()((set, get) => ({
  postcards: [],
  isLoading: false,
  error: null,

  setPostcards: (postcards) => set({ postcards }),

  addPostcard: (postcard) => {
    const existing = get().postcards;
    // Evitar duplicados (puede llegar por REST y por WebSocket)
    if (existing.some((p) => p.id === postcard.id)) return;
    set({ postcards: [postcard, ...existing] });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
