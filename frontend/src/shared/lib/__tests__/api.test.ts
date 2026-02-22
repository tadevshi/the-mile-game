import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available inside vi.mock factories (before imports)
const { mockPost, mockGet, mockInterceptorsUse } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockInterceptorsUse: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
      interceptors: {
        response: { use: mockInterceptorsUse },
      },
    })),
    // healthCheck calls axios.get directly (not the instance)
    get: vi.fn(),
  },
}))

import { api } from '../api'

describe('ApiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    api.clearPlayerId()
    vi.clearAllMocks()
  })

  // ─── playerId management ────────────────────────────────────────────────────

  describe('getPlayerId', () => {
    it('returns null when nothing has been set', () => {
      expect(api.getPlayerId()).toBeNull()
    })

    it('returns the id that was set via setPlayerId', () => {
      api.setPlayerId('abc-123')
      expect(api.getPlayerId()).toBe('abc-123')
    })
  })

  describe('setPlayerId', () => {
    it('stores the id in memory', () => {
      api.setPlayerId('test-uuid')
      expect(api.getPlayerId()).toBe('test-uuid')
    })

    it('persists the id to localStorage', () => {
      api.setPlayerId('test-uuid')
      expect(localStorage.getItem('mile-game-player-id')).toBe('test-uuid')
    })
  })

  describe('clearPlayerId', () => {
    it('removes the id from memory', () => {
      api.setPlayerId('test-uuid')
      api.clearPlayerId()
      expect(api.getPlayerId()).toBeNull()
    })

    it('removes the id from localStorage', () => {
      api.setPlayerId('test-uuid')
      api.clearPlayerId()
      expect(localStorage.getItem('mile-game-player-id')).toBeNull()
    })
  })

  // ─── createPlayer ───────────────────────────────────────────────────────────

  describe('createPlayer', () => {
    it('POSTs to /players with the provided data', async () => {
      const player = { id: 'player-uuid', name: 'Ana', avatar: '👸', score: 0, created_at: '' }
      mockPost.mockResolvedValueOnce({ data: player })

      await api.createPlayer({ name: 'Ana', avatar: '👸' })

      expect(mockPost).toHaveBeenCalledWith('/players', { name: 'Ana', avatar: '👸' })
    })

    it('returns the player data', async () => {
      const player = { id: 'player-uuid', name: 'Ana', avatar: '👸', score: 0, created_at: '' }
      mockPost.mockResolvedValueOnce({ data: player })

      const result = await api.createPlayer({ name: 'Ana' })
      expect(result).toEqual(player)
    })

    it('automatically saves the new player id', async () => {
      const player = { id: 'auto-saved-id', name: 'Bob', avatar: '🧑', score: 0, created_at: '' }
      mockPost.mockResolvedValueOnce({ data: player })

      await api.createPlayer({ name: 'Bob' })

      expect(api.getPlayerId()).toBe('auto-saved-id')
    })
  })

  // ─── submitQuiz ─────────────────────────────────────────────────────────────

  describe('submitQuiz', () => {
    it('throws if no player id is set', async () => {
      await expect(
        api.submitQuiz({ favorites: {}, preferences: {}, description: '' })
      ).rejects.toThrow('No player ID set')
    })

    it('POSTs to /quiz/submit with the payload', async () => {
      api.setPlayerId('player-uuid')
      mockPost.mockResolvedValueOnce({ data: { score: 8, message: '¡Excelente!' } })

      const payload = {
        favorites: { singer: 'Taylor Swift' },
        preferences: { coffee_tea: 'Café' },
        description: 'Una persona genial',
      }
      await api.submitQuiz(payload)

      expect(mockPost).toHaveBeenCalledWith(
        '/quiz/submit',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Player-ID': 'player-uuid' }),
        })
      )
    })

    it('returns score and message on success', async () => {
      api.setPlayerId('player-uuid')
      mockPost.mockResolvedValueOnce({ data: { score: 7, message: '¡Muy bien!' } })

      const result = await api.submitQuiz({ favorites: {}, preferences: {}, description: '' })
      expect(result).toEqual({ score: 7, message: '¡Muy bien!' })
    })
  })

  // ─── getRanking ─────────────────────────────────────────────────────────────

  describe('getRanking', () => {
    it('GETs /ranking', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })
      await api.getRanking()
      expect(mockGet).toHaveBeenCalledWith('/ranking')
    })

    it('returns the ranking data', async () => {
      const ranking = [
        { position: 1, player: { id: 'p1', name: 'Ana', avatar: '👸', score: 10, created_at: '' } },
      ]
      mockGet.mockResolvedValueOnce({ data: ranking })

      const result = await api.getRanking()
      expect(result).toEqual(ranking)
    })
  })
})
