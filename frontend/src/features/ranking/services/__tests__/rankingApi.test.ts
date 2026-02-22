import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RankingEntry } from '@/shared/lib/api'

vi.mock('@/shared/lib/api', () => ({
  api: {
    getRanking: vi.fn(),
    getPlayerId: vi.fn(),
  },
}))

import { api } from '@/shared/lib/api'
import { rankingService } from '../rankingApi'

const mockRanking: RankingEntry[] = [
  { position: 1, player: { id: 'p1', name: 'Ana',   avatar: '👸', score: 10, created_at: '' } },
  { position: 2, player: { id: 'p2', name: 'Bob',   avatar: '🧑', score: 8,  created_at: '' } },
  { position: 3, player: { id: 'p3', name: 'Carla', avatar: '💃', score: 7,  created_at: '' } },
  { position: 4, player: { id: 'p4', name: 'Diego', avatar: '🎩', score: 5,  created_at: '' } },
  { position: 5, player: { id: 'p5', name: 'Eva',   avatar: '🌸', score: 3,  created_at: '' } },
  { position: 6, player: { id: 'p6', name: 'Fran',  avatar: '🎭', score: 1,  created_at: '' } },
]

describe('rankingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRanking', () => {
    it('delegates to api.getRanking', async () => {
      vi.mocked(api.getRanking).mockResolvedValueOnce(mockRanking)

      const result = await rankingService.getRanking()

      expect(api.getRanking).toHaveBeenCalledOnce()
      expect(result).toEqual(mockRanking)
    })

    it('propagates errors from api.getRanking', async () => {
      vi.mocked(api.getRanking).mockRejectedValueOnce(new Error('Network error'))
      await expect(rankingService.getRanking()).rejects.toThrow('Network error')
    })
  })

  describe('getOtherPlayers', () => {
    it('filters out the current player by id', async () => {
      vi.mocked(api.getRanking).mockResolvedValue(mockRanking)
      vi.mocked(api.getPlayerId).mockReturnValue('p2')

      const result = await rankingService.getOtherPlayers(10)

      const ids = result.map((p) => p.id)
      expect(ids).not.toContain('p2')
      expect(ids).toContain('p1')
      expect(ids).toContain('p3')
    })

    it('returns at most `limit` players', async () => {
      vi.mocked(api.getRanking).mockResolvedValue(mockRanking)
      vi.mocked(api.getPlayerId).mockReturnValue(null)

      const result = await rankingService.getOtherPlayers(3)

      expect(result).toHaveLength(3)
    })

    it('defaults to a limit of 5', async () => {
      vi.mocked(api.getRanking).mockResolvedValue(mockRanking)
      vi.mocked(api.getPlayerId).mockReturnValue(null)

      const result = await rankingService.getOtherPlayers()

      expect(result).toHaveLength(5)
    })

    it('returns fewer than limit when not enough players exist', async () => {
      vi.mocked(api.getRanking).mockResolvedValue(mockRanking.slice(0, 2))
      vi.mocked(api.getPlayerId).mockReturnValue(null)

      const result = await rankingService.getOtherPlayers(10)

      expect(result).toHaveLength(2)
    })

    it('returns empty array when all players are the current player', async () => {
      const singleEntry: RankingEntry[] = [mockRanking[0]]
      vi.mocked(api.getRanking).mockResolvedValue(singleEntry)
      vi.mocked(api.getPlayerId).mockReturnValue('p1')

      const result = await rankingService.getOtherPlayers(5)

      expect(result).toHaveLength(0)
    })

    it('includes all players when current player id is null', async () => {
      vi.mocked(api.getRanking).mockResolvedValue(mockRanking)
      vi.mocked(api.getPlayerId).mockReturnValue(null)

      const result = await rankingService.getOtherPlayers(10)

      expect(result).toHaveLength(6)
    })
  })
})
