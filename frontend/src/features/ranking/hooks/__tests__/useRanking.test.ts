import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { RankingEntry } from '@/shared/lib/api'
import { useWebSocketStore } from '@/shared/store/websocketStore'

// Mock useWebSocketStore to avoid real WebSocket connections
vi.mock('@/shared/store/websocketStore', () => ({
  useWebSocketStore: vi.fn(),
}))

vi.mock('../../services/rankingApi', () => ({
  rankingService: {
    getRanking: vi.fn(),
  },
}))

vi.mock('@/shared/lib/api', () => ({
  api: {
    getPlayerId: vi.fn(() => 'current-player-id'),
  },
}))

import { useRanking } from '../useRanking'
import { rankingService } from '../../services/rankingApi'

const mockRanking: RankingEntry[] = [
  { position: 1, player: { id: 'p1', name: 'Ana',   avatar: '👸', score: 10, created_at: '' } },
  { position: 2, player: { id: 'p2', name: 'Bob',   avatar: '🧑', score: 8,  created_at: '' } },
  { position: 3, player: { id: 'p3', name: 'Carla', avatar: '💃', score: 7,  created_at: '' } },
  { position: 4, player: { id: 'p4', name: 'Diego', avatar: '🎩', score: 5,  created_at: '' } },
  { position: 5, player: { id: 'p5', name: 'Eva',   avatar: '🌸', score: 3,  created_at: '' } },
]

describe('useRanking', () => {
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rankingService.getRanking).mockResolvedValue(mockRanking)
    
    mockSubscribe = vi.fn().mockReturnValue(vi.fn()); // Returns unsubscribe function
    mockConnect = vi.fn();

    // Mock as React hook: called with a selector (state => state.isConnected)
    vi.mocked(useWebSocketStore).mockImplementation((selector?: any) => {
      if (typeof selector === 'function') {
        return selector({ isConnected: true });
      }
      return { isConnected: true };
    });

    // Zustand stores expose static methods directly on the hook function.
    // vi.fn() is a plain function — we must assign getState manually so that
    // `useWebSocketStore.getState()` works when called inside the hook's useEffect.
    (useWebSocketStore as any).getState = vi.fn(() => ({
      isConnected: false,
      isConnecting: false,
      connect: mockConnect,
      subscribe: mockSubscribe,
    }));
  })

  // ─── loadRanking ─────────────────────────────────────────────────────────────

  describe('loadRanking', () => {
    it('fetches the ranking on mount', async () => {
      const { result } = renderHook(() => useRanking())

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(rankingService.getRanking).toHaveBeenCalledOnce()
      expect(result.current.ranking).toEqual(mockRanking)
    })

    it('starts with isLoading=true', () => {
      // Mock a slow request that never resolves (for this test)
      vi.mocked(rankingService.getRanking).mockReturnValueOnce(new Promise(() => {}))
      const { result } = renderHook(() => useRanking())
      expect(result.current.isLoading).toBe(true)
    })

    it('sets isLoading=false after fetching', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('sets error message on fetch failure', async () => {
      vi.mocked(rankingService.getRanking).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useRanking())

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.error).toBe('Error al cargar el ranking. Intenta de nuevo.')
    })

    it('sets currentPlayerId from api.getPlayerId', async () => {
      const { result } = renderHook(() => useRanking())

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.currentPlayerId).toBe('current-player-id')
    })

    it('clears error on successful reload', async () => {
      vi.mocked(rankingService.getRanking)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(mockRanking)

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.error).not.toBe('')

      await act(async () => {
        await result.current.loadRanking()
      })

      expect(result.current.error).toBe('')
    })
  })

  // ─── derived state ────────────────────────────────────────────────────────────

  describe('top3', () => {
    it('contains the first 3 entries', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.top3).toHaveLength(3)
    })

    it('assigns gold medal to position 1', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const gold = result.current.top3.find((p) => p.position === 1)
      expect(gold?.medal).toBe('gold')
    })

    it('assigns silver medal to position 2', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const silver = result.current.top3.find((p) => p.position === 2)
      expect(silver?.medal).toBe('silver')
    })

    it('assigns bronze medal to position 3', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const bronze = result.current.top3.find((p) => p.position === 3)
      expect(bronze?.medal).toBe('bronze')
    })

    it('handles fewer than 3 players gracefully', async () => {
      vi.mocked(rankingService.getRanking).mockResolvedValueOnce(mockRanking.slice(0, 1))

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.top3).toHaveLength(1)
    })
  })

  describe('podiumOrder', () => {
    it('is ordered as [2nd, 1st, 3rd]', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const [second, first, third] = result.current.podiumOrder
      expect(first.position).toBe(1)
      expect(second.position).toBe(2)
      expect(third.position).toBe(3)
    })

    it('filters out undefined slots when fewer than 3 players', async () => {
      vi.mocked(rankingService.getRanking).mockResolvedValueOnce(mockRanking.slice(0, 1))

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Only 1 player → podiumOrder should have 1 (no undefined)
      expect(result.current.podiumOrder).toHaveLength(1)
      expect(result.current.podiumOrder[0]).toBeDefined()
    })
  })

  describe('restOfPlayers', () => {
    it('contains entries from position 4 onwards', async () => {
      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.restOfPlayers).toHaveLength(2) // p4, p5
      expect(result.current.restOfPlayers[0].player.id).toBe('p4')
      expect(result.current.restOfPlayers[1].player.id).toBe('p5')
    })

    it('is empty when there are 3 or fewer players', async () => {
      vi.mocked(rankingService.getRanking).mockResolvedValueOnce(mockRanking.slice(0, 3))

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.restOfPlayers).toHaveLength(0)
    })
  })

  // ─── WebSocket integration ────────────────────────────────────────────────────

  describe('WebSocket integration', () => {
    it('updates ranking when it receives a ranking_update message', async () => {
      let messageHandler: ((msg: any) => void) | undefined;
      mockSubscribe.mockImplementation((handler: any) => {
        messageHandler = handler;
        return vi.fn(); // unsubscribe
      });

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const updatedRanking: RankingEntry[] = [
        { position: 1, player: { id: 'p99', name: 'New Leader', avatar: '🏆', score: 15, created_at: '' } },
      ]

      act(() => {
        if (messageHandler) {
          messageHandler({
            type: 'ranking_update',
            ranking: updatedRanking,
          });
        }
      })

      expect(result.current.ranking).toEqual(updatedRanking)
    })

    it('ignores messages that are not ranking_update', async () => {
      let messageHandler: ((msg: any) => void) | undefined;
      mockSubscribe.mockImplementation((handler: any) => {
        messageHandler = handler;
        return vi.fn(); // unsubscribe
      });

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const originalRanking = result.current.ranking

      act(() => {
        if (messageHandler) {
          messageHandler({ type: 'other_event' });
        }
      })

      expect(result.current.ranking).toEqual(originalRanking)
    })

    it('connects to WebSocket if not already connected', () => {
      renderHook(() => useRanking())
      expect(mockConnect).toHaveBeenCalledOnce()
    })
    
    it('returns connection status from store', () => {
      const mockStore = Object.assign(
        vi.fn((selector) => {
          if (typeof selector === 'function') {
            return selector({ isConnected: true });
          }
          return { isConnected: true };
        }),
        {
          getState: () => ({
            isConnected: false,
            isConnecting: false,
            connect: mockConnect,
            subscribe: mockSubscribe,
          }),
        }
      );
      
      vi.mocked(useWebSocketStore).mockImplementation(mockStore as any);
      
      const { result } = renderHook(() => useRanking())
      expect(result.current.isWsConnected).toBe(true)
    })
  })
})
