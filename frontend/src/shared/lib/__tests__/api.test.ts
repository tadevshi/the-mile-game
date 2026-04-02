import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available inside vi.mock factories (before imports)
const { mockPost, mockGet, mockInterceptorsUse, mockRequestInterceptorsUse } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockInterceptorsUse: vi.fn(),
  mockRequestInterceptorsUse: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: mockRequestInterceptorsUse },
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
    it('GETs /admin/status without legacy admin headers', async () => {
      mockGet.mockResolvedValueOnce({ data: { total: 5, revealed: false, revealed_at: null } })

      await api.getSecretBoxStatus()

      expect(mockGet).toHaveBeenCalledWith('/admin/status')
    })

    it('returns the secret box status', async () => {
      const status = { total: 3, revealed: true, revealed_at: '2026-03-15T20:00:00Z' }
      mockGet.mockResolvedValueOnce({ data: status })

      const result = await api.getSecretBoxStatus()
      expect(result).toEqual(status)
    })
  })

  // ─── listSecretPostcards ─────────────────────────────────────────────────────

  describe('listSecretPostcards', () => {
    it('GETs /admin/secret-box without legacy admin headers', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })

      await api.listSecretPostcards()

      expect(mockGet).toHaveBeenCalledWith('/admin/secret-box')
    })

    it('returns the list of secret postcards', async () => {
      const postcards = [
        { id: 'uuid-1', sender_name: 'Abuela Rosa', message: '¡Feliz cumple!', is_secret: true },
        { id: 'uuid-2', sender_name: 'Tío Jorge', message: 'Un abrazo enorme', is_secret: true },
      ]
      mockGet.mockResolvedValueOnce({ data: postcards })

      const result = await api.listSecretPostcards()
      expect(result).toEqual(postcards)
    })
  })

  // ─── createPostcard ──────────────────────────────────────────────────────────

  describe('createPostcard', () => {
    it('throws if no player id and no senderName provided', async () => {
      // No player registered, no name given
      await expect(
        api.createPostcard(new File(['img'], 'photo.jpg', { type: 'image/jpeg' }), 'Hola!')
      ).rejects.toThrow('Se requiere un nombre')
    })

    it('auto-registers as guest with 📸 avatar when no playerId but senderName given', async () => {
      const player = { id: 'guest-uuid', name: 'Laura', avatar: '📸', score: 0, created_at: '' }
      const postcard = { id: 'pc-uuid', message: 'Hola!', sender_name: 'Laura', is_secret: false }

      // First call: createPlayer, second: createPostcard
      mockPost
        .mockResolvedValueOnce({ data: player })
        .mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await api.createPostcard(file, 'Hola!', 'Laura')

      // Should have auto-registered with 📸 avatar
      expect(mockPost).toHaveBeenNthCalledWith(1, '/players', { name: 'Laura', avatar: '📸' })
      // Should have stored the new player id
      expect(api.getPlayerId()).toBe('guest-uuid')
      // Should then POST to /postcards with the player id header
      expect(mockPost).toHaveBeenNthCalledWith(
        2,
        '/postcards',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Player-ID': 'guest-uuid' }),
        })
      )
      expect(result).toEqual(postcard)
    })

    it('skips auto-registration when playerId is already set', async () => {
      api.setPlayerId('existing-player-uuid')
      const postcard = { id: 'pc-uuid', message: 'Chau!', sender_name: 'Ana', is_secret: false }
      mockPost.mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      await api.createPostcard(file, 'Chau!', 'Ana')

      // Only ONE post call — no auto-register
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledWith(
        '/postcards',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Player-ID': 'existing-player-uuid' }),
        })
      )
    })

    it('includes sender_name in the form data when provided', async () => {
      api.setPlayerId('player-uuid')
      const postcard = { id: 'pc-uuid', message: 'Hola!', sender_name: 'Titi', is_secret: false }
      mockPost.mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      await api.createPostcard(file, 'Hola!', 'Titi')

      const formDataArg = mockPost.mock.calls[0][1] as FormData
      expect(formDataArg.get('sender_name')).toBe('Titi')
      expect(formDataArg.get('message')).toBe('Hola!')
    })

    it('omits sender_name from form data when not provided', async () => {
      api.setPlayerId('player-uuid')
      const postcard = { id: 'pc-uuid', message: 'Test', sender_name: null, is_secret: false }
      mockPost.mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      await api.createPostcard(file, 'Test')

      const formDataArg = mockPost.mock.calls[0][1] as FormData
      expect(formDataArg.get('sender_name')).toBeNull()
    })
  })

  describe('createPostcardScoped', () => {
    it('reuses the current player only when it belongs to the same event', async () => {
      api.setPlayerId('event-player-uuid', 'ale-roy')
      mockPost.mockResolvedValueOnce({ data: { id: 'pc-1', message: 'Hola!' } })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      await api.createPostcardScoped('ale-roy', file, 'Hola!', { senderName: 'Laura' })

      expect(mockPost).toHaveBeenCalledWith(
        '/events/ale-roy/postcards',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Player-ID': 'event-player-uuid' }),
        })
      )
    })

    it('creates a guest player when the stored player belongs to another event', async () => {
      api.setPlayerId('other-event-player', 'cumple-meli')
      const guest = { id: 'guest-uuid', name: 'Laura', avatar: '📸', score: 0, created_at: '' }
      const postcard = { id: 'pc-2', message: 'Hola!', sender_name: 'Laura', is_secret: false }

      mockPost
        .mockResolvedValueOnce({ data: guest })
        .mockResolvedValueOnce({ data: postcard })

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await api.createPostcardScoped('ale-roy', file, 'Hola!', { senderName: 'Laura' })

      expect(mockPost).toHaveBeenNthCalledWith(1, '/events/ale-roy/players', { name: 'Laura', avatar: '📸' })
      expect(mockPost).toHaveBeenNthCalledWith(
        2,
        '/events/ale-roy/postcards',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Player-ID': 'guest-uuid' }),
        })
      )
      expect(api.getPlayerEventSlug()).toBe('ale-roy')
      expect(result).toEqual(postcard)
    })
  })

  // ─── revealSecretBox ─────────────────────────────────────────────────────────

  describe('revealSecretBox', () => {
    it('POSTs to /admin/reveal without legacy admin headers', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Revealed!', postcards: [] } })

      await api.revealSecretBox()

      expect(mockPost).toHaveBeenCalledWith('/admin/reveal', {})
    })

    it('returns the revealed postcards', async () => {
      const postcards = [
        { id: 'uuid-1', sender_name: 'Abuela Rosa', message: '¡Feliz cumple!', is_secret: true },
      ]
      mockPost.mockResolvedValueOnce({ data: { message: 'Secret Box revealed!', postcards } })

      const result = await api.revealSecretBox()
      expect(result.postcards).toEqual(postcards)
      expect(result.message).toBe('Secret Box revealed!')
    })
  })
})
