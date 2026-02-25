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

  // ─── createSecretPostcard ────────────────────────────────────────────────────

  describe('createSecretPostcard', () => {
    it('POSTs to /postcards/secret with X-Secret-Token header', async () => {
      const postcard = { id: 'uuid-1', message: 'Hola!', sender_name: 'Abuela Rosa', is_secret: true }
      mockPost.mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      await api.createSecretPostcard(file, 'Hola!', 'Abuela Rosa', 'my-secret-token')

      expect(mockPost).toHaveBeenCalledWith(
        '/postcards/secret',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Secret-Token': 'my-secret-token',
            'Content-Type': 'multipart/form-data',
          }),
        })
      )
    })

    it('returns the created secret postcard', async () => {
      const postcard = { id: 'uuid-1', message: 'Te quiero!', sender_name: 'Tía Laura', is_secret: true }
      mockPost.mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await api.createSecretPostcard(file, 'Te quiero!', 'Tía Laura', 'token-123')

      expect(result).toEqual(postcard)
    })
  })

  // ─── getSecretBoxStatus ──────────────────────────────────────────────────────

  describe('getSecretBoxStatus', () => {
    it('GETs /admin/status with X-Admin-Key header', async () => {
      mockGet.mockResolvedValueOnce({ data: { total: 5, revealed: false, revealed_at: null } })

      await api.getSecretBoxStatus('admin-passphrase')

      expect(mockGet).toHaveBeenCalledWith(
        '/admin/status',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Admin-Key': 'admin-passphrase' }),
        })
      )
    })

    it('returns the secret box status', async () => {
      const status = { total: 3, revealed: true, revealed_at: '2026-03-15T20:00:00Z' }
      mockGet.mockResolvedValueOnce({ data: status })

      const result = await api.getSecretBoxStatus('admin-key')
      expect(result).toEqual(status)
    })
  })

  // ─── listSecretPostcards ─────────────────────────────────────────────────────

  describe('listSecretPostcards', () => {
    it('GETs /admin/secret-box with X-Admin-Key header', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })

      await api.listSecretPostcards('admin-passphrase')

      expect(mockGet).toHaveBeenCalledWith(
        '/admin/secret-box',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Admin-Key': 'admin-passphrase' }),
        })
      )
    })

    it('returns the list of secret postcards', async () => {
      const postcards = [
        { id: 'uuid-1', sender_name: 'Abuela Rosa', message: '¡Feliz cumple!', is_secret: true },
        { id: 'uuid-2', sender_name: 'Tío Jorge', message: 'Un abrazo enorme', is_secret: true },
      ]
      mockGet.mockResolvedValueOnce({ data: postcards })

      const result = await api.listSecretPostcards('admin-key')
      expect(result).toEqual(postcards)
    })
  })

  // ─── revealSecretBox ─────────────────────────────────────────────────────────

  describe('revealSecretBox', () => {
    it('POSTs to /admin/reveal with X-Admin-Key header', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Revealed!', postcards: [] } })

      await api.revealSecretBox('admin-passphrase')

      expect(mockPost).toHaveBeenCalledWith(
        '/admin/reveal',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Admin-Key': 'admin-passphrase' }),
        })
      )
    })

    it('returns the revealed postcards', async () => {
      const postcards = [
        { id: 'uuid-1', sender_name: 'Abuela Rosa', message: '¡Feliz cumple!', is_secret: true },
      ]
      mockPost.mockResolvedValueOnce({ data: { message: 'Secret Box revealed!', postcards } })

      const result = await api.revealSecretBox('admin-key')
      expect(result.postcards).toEqual(postcards)
      expect(result.message).toBe('Secret Box revealed!')
    })
  })
})
