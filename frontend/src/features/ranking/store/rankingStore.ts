import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RankingPlayer {
  id: string;
  name: string;
  score: number;
  avatar: string;
  isCurrentPlayer?: boolean;
}

export interface RankingState {
  players: RankingPlayer[];
  currentPlayerId: string | null;
  addPlayer: (player: Omit<RankingPlayer, 'id'>) => void;
  updateCurrentPlayerScore: (score: number) => void;
  getSortedRanking: () => RankingPlayer[];
  resetRanking: () => void;
}

// Jugadores mock para simular competencia
const mockPlayers: RankingPlayer[] = [
  { id: '1', name: 'María', score: 185, avatar: '👩' },
  { id: '2', name: 'Sofía', score: 210, avatar: '👧' },
  { id: '3', name: 'Lucía', score: 160, avatar: '👱‍♀️' },
  { id: '4', name: 'Elena', score: 145, avatar: '👩‍🦰' },
  { id: '5', name: 'Valentina', score: 130, avatar: '👸' },
  { id: '6', name: 'Isabella', score: 115, avatar: '👩‍🦱' },
];

export const useRankingStore = create<RankingState>()(
  persist(
    (set, get) => ({
      players: mockPlayers,
      currentPlayerId: null,

      addPlayer: (player) => {
        const id = `player-${Date.now()}`;
        const newPlayer: RankingPlayer = {
          ...player,
          id,
          isCurrentPlayer: true,
        };
        
        // Remover jugador actual anterior si existe
        const filteredPlayers = get().players.filter((p) => !p.isCurrentPlayer);
        
        set({
          players: [...filteredPlayers, newPlayer],
          currentPlayerId: id,
        });
      },

      updateCurrentPlayerScore: (score) => {
        const { players, currentPlayerId } = get();
        
        if (!currentPlayerId) return;

        set({
          players: players.map((p) =>
            p.id === currentPlayerId ? { ...p, score } : p
          ),
        });
      },

      getSortedRanking: () => {
        const { players } = get();
        return [...players].sort((a, b) => b.score - a.score);
      },

      resetRanking: () =>
        set({
          players: mockPlayers,
          currentPlayerId: null,
        }),
    }),
    {
      name: 'mile-game-ranking',
    }
  )
);
