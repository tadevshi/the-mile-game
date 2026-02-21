import { api } from '@/shared/lib/api';
import type { RankingEntry, Player } from '@/shared/lib/api';

export const rankingService = {
  getRanking: (): Promise<RankingEntry[]> =>
    api.getRanking(),

  /**
   * Returns up to `limit` players from the ranking,
   * excluding the current player (identified by api.getPlayerId()).
   */
  getOtherPlayers: async (limit = 5): Promise<Player[]> => {
    const entries = await api.getRanking();
    const currentId = api.getPlayerId();
    return entries
      .map((e) => e.player)
      .filter((p) => p.id !== currentId)
      .slice(0, limit);
  },
};
