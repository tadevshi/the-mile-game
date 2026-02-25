import { create } from 'zustand';
import type { Postcard } from '../types/postcards.types';

export interface PostcardState {
  postcards: Postcard[];
  isLoading: boolean;
  error: string | null;
  // Secret Box reveal animation state
  isRevealing: boolean;
  revealedPostcards: Postcard[];

  setPostcards: (postcards: Postcard[]) => void;
  addPostcard: (postcard: Postcard) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRevealing: (revealing: boolean) => void;
  addRevealedPostcards: (postcards: Postcard[]) => void;
}

export const usePostcardStore = create<PostcardState>()((set, get) => ({
  postcards: [],
  isLoading: false,
  error: null,
  isRevealing: false,
  revealedPostcards: [],

  setPostcards: (postcards) => set({ postcards }),

  addPostcard: (postcard) => {
    const existing = get().postcards;
    // Evitar duplicados (puede llegar por REST y por WebSocket)
    if (existing.some((p) => p.id === postcard.id)) return;
    set({ postcards: [postcard, ...existing] });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setRevealing: (isRevealing) => set({ isRevealing }),

  addRevealedPostcards: (incoming) => {
    const existing = get().postcards;
    // Merge: add only those not already in the board (dedup by id)
    const newOnes = incoming.filter((p) => !existing.some((e) => e.id === p.id));
    set({
      postcards: [...existing, ...newOnes],
      revealedPostcards: incoming,
      isRevealing: false,
    });
  },
}));
