import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { RankingEntry } from '@/shared/lib/api'

// Mock useWebSocket to avoid real WebSocket connections
vi.mock('@/shared/hooks', () => ({
  useWebSocket: vi.fn(),
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

import { useWebSocket } from '@/shared/hooks'
import { useRanking } from '../useRanking'
import { rankingService } from '../../services/rankingApi'
import type { UseWebSocketOptions } from '@/shared/hooks/useWebSocket'

const mockRanking: RankingEntry[] = [
  { position: 1, player: { id: 'p1', name: 'Ana',   avatar: '👸', score: 10, created_at: '' } },
  { position: 2, player: { id: 'p2', name: 'Bob',   avatar: '🧑', score: 8,  created_at: '' } },
  { position: 3, player: { id: 'p3', name: 'Carla', avatar: '💃', score: 7,  created_at: '' } },
  { position: 4, player: { id: 'p4', name: 'Diego', avatar: '🎩', score: 5,  created_at: '' } },
  { position: 5, player: { id: 'p5', name: 'Eva',   avatar: '🌸', score: 3,  created_at: '' } },
]

const WS_RETURN = {
  isConnected: false,
  lastMessage: null,
  sendMessage: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}

describe('useRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rankingService.getRanking).mockResolvedValue(mockRanking)
    vi.mocked(useWebSocket).mockReturnValue(WS_RETURN)
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
      let capturedOptions: UseWebSocketOptions | undefined

      vi.mocked(useWebSocket).mockImplementation((_url, options) => {
        capturedOptions = options
        return WS_RETURN
      })

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const updatedRanking: RankingEntry[] = [
        { position: 1, player: { id: 'p99', name: 'New Leader', avatar: '🏆', score: 15, created_at: '' } },
      ]

      act(() => {
        capturedOptions?.onMessage?.({
          type: 'ranking_update',
          data: null,
          ranking: updatedRanking,
        } as unknown as { type: string; data: unknown })
      })

      expect(result.current.ranking).toEqual(updatedRanking)
    })

    it('ignores messages that are not ranking_update', async () => {
      let capturedOptions: UseWebSocketOptions | undefined

      vi.mocked(useWebSocket).mockImplementation((_url, options) => {
        capturedOptions = options
        return WS_RETURN
      })

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const originalRanking = result.current.ranking

      act(() => {
        capturedOptions?.onMessage?.({ type: 'other_event', data: null })
      })

      expect(result.current.ranking).toEqual(originalRanking)
    })

    it('sets isWsConnected=true on WebSocket connect', async () => {
      let capturedOptions: UseWebSocketOptions | undefined

      vi.mocked(useWebSocket).mockImplementation((_url, options) => {
        capturedOptions = options
        return WS_RETURN
      })

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => { capturedOptions?.onConnect?.() })

      expect(result.current.isWsConnected).toBe(true)
    })

    it('sets isWsConnected=false on WebSocket disconnect', async () => {
      let capturedOptions: UseWebSocketOptions | undefined

      vi.mocked(useWebSocket).mockImplementation((_url, options) => {
        capturedOptions = options
        return { ...WS_RETURN, isConnected: true }
      })

      const { result } = renderHook(() => useRanking())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => { capturedOptions?.onConnect?.() })
      act(() => { capturedOptions?.onDisconnect?.() })

      expect(result.current.isWsConnected).toBe(false)
    })
  })
})
