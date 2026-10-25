import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuizStore } from '../../store/quizStore'
import { useEventStore } from '@/shared/store/eventStore'
import type { QuizQuestionResponse } from '../../types/quiz-player.types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...original,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../services/quizApi', () => ({
  quizService: { submitAnswersScoped: vi.fn() },
}))

import { useQuiz } from '../useQuiz'
import { quizService } from '../../services/quizApi'

const questions: QuizQuestionResponse[] = [
  { id: '1', section: 'favorites', key: 'singer', question_text: 'Singer?', options: null, sort_order: 0, is_scorable: true },
  { id: '2', section: 'favorites', key: 'color', question_text: 'Color?', options: null, sort_order: 1, is_scorable: true },
  { id: '3', section: 'preferences', key: 'coffee', question_text: 'Drink?', options: ['Café', 'Té'], sort_order: 2, is_scorable: true },
  { id: '4', section: 'description', key: 'description', question_text: 'Describe', options: null, sort_order: 3, is_scorable: false },
]

function renderQuiz() {
  return renderHook(() => useQuiz(questions))
}

function setEvent() {
  useEventStore.getState().setEvent({
    id: 'event-1', slug: 'birthday', name: 'Birthday', isActive: true,
    features: { quiz: true, corkboard: true, secretBox: false },
  })
}

describe('useQuiz', () => {
  beforeEach(() => {
    useQuizStore.getState().resetQuiz()
    localStorage.clear()
    vi.clearAllMocks()
    setEvent()
  })

  describe('progress', () => {
    it('returns current=0 when there are no answers', () => {
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(0)
    })

    it('counts a filled favorite answer', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(1)
    })

    it('does not count a blank (whitespace-only) favorite', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', '   ')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(0)
    })

    it('counts a filled preference answer', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee', 'Café')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(1)
    })

    it('does not count an empty preference', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee', '')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(0)
    })

    it('counts the description when non-empty', () => {
      useQuizStore.getState().setDescription('Increíble persona')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(1)
    })

    it('does not count description when only whitespace', () => {
      useQuizStore.getState().setDescription('   ')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(0)
    })

    it('accumulates favorites + preferences + description', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor')
      useQuizStore.getState().setFavoriteAnswer('color', 'pink')
      useQuizStore.getState().setPreferenceAnswer('coffee', 'Café')
      useQuizStore.getState().setDescription('Genial')
      const { result } = renderQuiz()
      expect(result.current.progress.current).toBe(4)
    })

    it('total reflects the configured API questions, not a legacy constant', () => {
      const { result } = renderQuiz()
      expect(result.current.progress.total).toBe(4)
    })

    it('ignores answers to questions outside the current event', () => {
      useQuizStore.getState().setFavoriteAnswer('old-question', 'old answer')
      const { result } = renderQuiz()
      expect(result.current.progress).toEqual({ current: 0, total: 4 })
    })
  })

  describe('submitQuiz', () => {
    it('navigates to the event thank-you page on success', async () => {
      vi.mocked(quizService.submitAnswersScoped).mockResolvedValueOnce({ score: 8, message: '¡Excelente!' })
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(mockNavigate).toHaveBeenCalledWith('/e/birthday/thank-you')
    })

    it('saves the score to the store on success', async () => {
      vi.mocked(quizService.submitAnswersScoped).mockResolvedValueOnce({ score: 9, message: '¡Perfecto!' })
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(useQuizStore.getState().score).toBe(9)
    })

    it('marks the quiz as completed on success', async () => {
      vi.mocked(quizService.submitAnswersScoped).mockResolvedValueOnce({ score: 5, message: 'OK' })
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(useQuizStore.getState().hasCompleted).toBe(true)
    })

    it('sets error message and does not navigate on failure', async () => {
      vi.mocked(quizService.submitAnswersScoped).mockRejectedValueOnce(new Error('Network error'))
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(result.current.error).toBe('Error al enviar respuestas. Intenta de nuevo.')
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(useQuizStore.getState().score).toBe(0)
      expect(useQuizStore.getState().hasCompleted).toBe(false)
    })

    it('sets isLoading=true while submitting and false after', async () => {
      let resolveSubmit!: (value: { score: number; message: string }) => void
      vi.mocked(quizService.submitAnswersScoped).mockReturnValueOnce(
        new Promise((res) => { resolveSubmit = res })
      )
      const { result } = renderQuiz()
      act(() => { void result.current.submitQuiz() })
      expect(result.current.isLoading).toBe(true)
      await act(async () => { resolveSubmit({ score: 5, message: 'OK' }) })
      expect(result.current.isLoading).toBe(false)
    })

    it('clears previous error on a new submit attempt', async () => {
      vi.mocked(quizService.submitAnswersScoped).mockRejectedValueOnce(new Error('fail'))
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(result.current.error).not.toBe('')
      vi.mocked(quizService.submitAnswersScoped).mockResolvedValueOnce({ score: 7, message: 'OK' })
      await act(async () => { await result.current.submitQuiz() })
      expect(result.current.error).toBe('')
    })

    it('passes only configured answers and event slug to the scoped service', async () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setFavoriteAnswer('old-question', 'omit this')
      useQuizStore.getState().setPreferenceAnswer('coffee', 'Café')
      useQuizStore.getState().setDescription('Genial')
      vi.mocked(quizService.submitAnswersScoped).mockResolvedValueOnce({ score: 8, message: 'OK' })
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(quizService.submitAnswersScoped).toHaveBeenCalledExactlyOnceWith('birthday', {
        favorites: { singer: 'Taylor Swift' },
        preferences: { coffee: 'Café' },
        description: 'Genial',
      })
    })

    it('rejects a missing event without submitting or changing quiz data', async () => {
      useEventStore.getState().clearEvent()
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor')
      const { result } = renderQuiz()
      await act(async () => { await result.current.submitQuiz() })
      expect(result.current.error).toBe('No se encontró el evento. Intenta recargar la página.')
      expect(result.current.isLoading).toBe(false)
      expect(quizService.submitAnswersScoped).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(result.current.answers.favorites).toEqual({ singer: 'Taylor' })
      expect(useQuizStore.getState().score).toBe(0)
      expect(useQuizStore.getState().hasCompleted).toBe(false)
    })
  })

  describe('exposed state', () => {
    it('exposes playerName from the store', () => {
      useQuizStore.getState().setPlayerName('Milena')
      const { result } = renderQuiz()
      expect(result.current.playerName).toBe('Milena')
    })

    it('exposes answers from the store', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor')
      const { result } = renderQuiz()
      expect(result.current.answers.favorites.singer).toBe('Taylor')
    })
  })
})
