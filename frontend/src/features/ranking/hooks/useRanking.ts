import { useState, useCallback, useEffect } from 'react';
import { useWebSocket, type WebSocketMessage } from '@/shared/hooks';
import { api, type RankingEntry } from '@/shared/lib/api';
import { rankingService } from '../services/rankingApi';

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:'
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`);

export function useRanking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // WebSocket for real-time updates
  useWebSocket(WS_URL, {
    onMessage: (message: WebSocketMessage) => {
      const rankingData = (message as { ranking?: RankingEntry[] }).ranking;
      if (message.type === 'ranking_update' && Array.isArray(rankingData)) {
        setRanking(rankingData);
      }
    },
    onConnect: () => setIsWsConnected(true),
    onDisconnect: () => setIsWsConnected(false),
    onError: () => setIsWsConnected(false),
  });

  const loadRanking = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await rankingService.getRanking();
      setRanking(data);
      setCurrentPlayerId(api.getPlayerId());
      setError('');
    } catch (err) {
      console.error('Error loading ranking:', err);
      setError('Error al cargar el ranking. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  // Derived state
  const top3 = ranking.slice(0, 3).map((entry) => ({
    ...entry.player,
    position: entry.position,
    medal: entry.position === 1 ? 'gold' : entry.position === 2 ? 'silver' : 'bronze',
  }));

  // Podium display order: [2nd, 1st, 3rd]
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  const restOfPlayers = ranking.slice(3);

  return {
    ranking,
    isLoading,
    error,
    currentPlayerId,
    isWsConnected,
    top3,
    podiumOrder,
    restOfPlayers,
    loadRanking,
  };
}
