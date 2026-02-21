import { create } from 'zustand';

export interface RankingPlayer {
  id: string;
  name: string;
  score: number;
  avatar: string;
}

export interface RankingState {
  currentPlayerId: string | null;
  setCurrentPlayerId: (id: string | null) => void;
}

// Store minimalista — el ranking real viene de la API (api.getRanking())
// Este store solo persiste el ID del jugador actual para destacarlo en el ranking
export const useRankingStore = create<RankingState>()((set) => ({
  currentPlayerId: null,
  setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
}));
