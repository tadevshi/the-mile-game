import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/api', () => ({
  api: {
    createPlayerScoped: vi.fn(),
    submitQuiz: vi.fn(),
  },
}))

import { api } from '@/shared/lib/api'
import { quizService } from '../quizApi'

describe('quizService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPlayer', () => {
    it('delegates to api.createPlayerScoped with eventSlug and player data', async () => {
      const player = { id: 'uuid', name: 'Ana', avatar: '👸', score: 0, created_at: '' }
      vi.mocked(api.createPlayerScoped).mockResolvedValueOnce(player)

      const result = await quizService.createPlayer('boda3', { name: 'Ana', avatar: '👸' })

      expect(api.createPlayerScoped).toHaveBeenCalledWith('boda3', { name: 'Ana', avatar: '👸' })
      expect(result).toEqual(player)
    })

    it('propagates errors from api.createPlayerScoped', async () => {
      vi.mocked(api.createPlayerScoped).mockRejectedValueOnce(new Error('Network error'))
      await expect(quizService.createPlayer('boda3', { name: 'Ana' })).rejects.toThrow('Network error')
    })
  })

  describe('submitAnswers', () => {
    it('delegates to api.submitQuiz with the same payload', async () => {
      const response = { score: 7, message: '¡Muy bien!' }
      vi.mocked(api.submitQuiz).mockResolvedValueOnce(response)

      const payload = {
        favorites: { singer: 'Taylor Swift' },
        preferences: { coffee_tea: 'Café' },
        description: 'Genial',
      }
      const result = await quizService.submitAnswers(payload)

      expect(api.submitQuiz).toHaveBeenCalledWith(payload)
      expect(result).toEqual(response)
    })

    it('propagates errors from api.submitQuiz', async () => {
      vi.mocked(api.submitQuiz).mockRejectedValueOnce(new Error('No player ID set'))
      await expect(
        quizService.submitAnswers({ favorites: {}, preferences: {}, description: '' })
      ).rejects.toThrow('No player ID set')
    })
  })
})
