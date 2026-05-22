import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocketStore } from '@/shared/store/websocketStore';
import { api, type RankingEntry } from '@/shared/lib/api';
import { rankingService } from '../services/rankingApi';

const WS_URL_BASE =
  import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:'
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`);

export function useRanking() {
  const { slug } = useParams<{ slug: string }>();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Use selectors to avoid unnecessary re-renders
  const isWsConnected = useWebSocketStore((state) => state.isConnected);

  // Build WebSocket URL with event slug
  const wsUrl = slug ? `${WS_URL_BASE}?event=${slug}` : WS_URL_BASE;

  // Initialize WebSocket connection and subscriptions
  useEffect(() => {
    const wsStore = useWebSocketStore.getState();

    // Connect if not already connected or URL changed
    if (!wsStore.isConnected && !wsStore.isConnecting) {
      wsStore.connect(wsUrl);
    } else if (wsStore.currentUrl !== wsUrl) {
      // URL changed, reconnect with new event slug
      wsStore.connect(wsUrl);
    }

    // Subscribe to messages
    const unsubscribe = wsStore.subscribe((message) => {
      const rankingData = (message as { ranking?: RankingEntry[] }).ranking;
      if (message.type === 'ranking_update' && Array.isArray(rankingData)) {
        setRanking(rankingData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [wsUrl]);

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
