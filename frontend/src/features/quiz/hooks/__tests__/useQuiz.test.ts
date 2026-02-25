import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuizStore } from '../../store/quizStore'

// Mock navigate — must be set up before importing the hook
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...original,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../services/quizApi', () => ({
  quizService: {
    submitAnswers: vi.fn(),
  },
}))

import { useQuiz } from '../useQuiz'
import { quizService } from '../../services/quizApi'

const INITIAL_STATE = {
  playerName: '',
  answers: { favorites: {}, preferences: {}, description: '' },
  hasCompleted: false,
  score: 0,
}

describe('useQuiz', () => {
  beforeEach(() => {
    useQuizStore.setState(INITIAL_STATE)
    localStorage.clear()
    vi.clearAllMocks()
  })

  // ─── progress calculation ───────────────────────────────────────────────────

  describe('progress', () => {
    it('returns current=0 when there are no answers', () => {
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(0)
    })

    it('counts a filled favorite answer', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(1)
    })

    it('does not count a blank (whitespace-only) favorite', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', '   ')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(0)
    })

    it('counts a filled preference answer', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee', 'Café')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(1)
    })

    it('does not count an empty preference', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee', '')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(0)
    })

    it('counts the description when non-empty', () => {
      useQuizStore.getState().setDescription('Increíble persona')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(1)
    })

    it('does not count description when only whitespace', () => {
      useQuizStore.getState().setDescription('   ')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(0)
    })

    it('accumulates favorites + preferences + description', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor')
      useQuizStore.getState().setFavoriteAnswer('color', 'pink')
      useQuizStore.getState().setPreferenceAnswer('coffee', 'Café')
      useQuizStore.getState().setDescription('Genial')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.current).toBe(4)
    })

    it('total reflects TOTAL_QUESTIONS constant (14)', () => {
      // total is fixed — does NOT grow dynamically as answers are added
      const { result } = renderHook(() => useQuiz())
      expect(result.current.progress.total).toBe(14)
    })
  })

  // ─── submitQuiz ─────────────────────────────────────────────────────────────

  describe('submitQuiz', () => {
    it('navigates to /thank-you on success', async () => {
      vi.mocked(quizService.submitAnswers).mockResolvedValueOnce({ score: 8, message: '¡Excelente!' })

      const { result } = renderHook(() => useQuiz())
      await act(async () => {
        await result.current.submitQuiz()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/thank-you')
    })

    it('saves the score to the store on success', async () => {
      vi.mocked(quizService.submitAnswers).mockResolvedValueOnce({ score: 9, message: '¡Perfecto!' })

      const { result } = renderHook(() => useQuiz())
      await act(async () => {
        await result.current.submitQuiz()
      })

      expect(useQuizStore.getState().score).toBe(9)
    })

    it('marks the quiz as completed on success', async () => {
      vi.mocked(quizService.submitAnswers).mockResolvedValueOnce({ score: 5, message: 'OK' })

      const { result } = renderHook(() => useQuiz())
      await act(async () => {
        await result.current.submitQuiz()
      })

      expect(useQuizStore.getState().hasCompleted).toBe(true)
    })

    it('sets error message and does not navigate on failure', async () => {
      vi.mocked(quizService.submitAnswers).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useQuiz())
      await act(async () => {
        await result.current.submitQuiz()
      })

      expect(result.current.error).toBe('Error al enviar respuestas. Intenta de nuevo.')
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('sets isLoading=true while submitting and false after', async () => {
      let resolveSubmit!: (value: { score: number; message: string }) => void
      vi.mocked(quizService.submitAnswers).mockReturnValueOnce(
        new Promise((res) => { resolveSubmit = res })
      )

      const { result } = renderHook(() => useQuiz())

      // Start submit — don't await yet
      act(() => { void result.current.submitQuiz() })
      expect(result.current.isLoading).toBe(true)

      // Resolve the promise
      await act(async () => { resolveSubmit({ score: 5, message: 'OK' }) })
      expect(result.current.isLoading).toBe(false)
    })

    it('clears previous error on a new submit attempt', async () => {
      // First submit fails
      vi.mocked(quizService.submitAnswers).mockRejectedValueOnce(new Error('fail'))
      const { result } = renderHook(() => useQuiz())
      await act(async () => { await result.current.submitQuiz() })
      expect(result.current.error).not.toBe('')

      // Second submit succeeds
      vi.mocked(quizService.submitAnswers).mockResolvedValueOnce({ score: 7, message: 'OK' })
      await act(async () => { await result.current.submitQuiz() })
      expect(result.current.error).toBe('')
    })

    it('passes answers from the store to the service', async () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setPreferenceAnswer('coffee', 'Café')
      useQuizStore.getState().setDescription('Genial')

      vi.mocked(quizService.submitAnswers).mockResolvedValueOnce({ score: 8, message: 'OK' })

      const { result } = renderHook(() => useQuiz())
      await act(async () => { await result.current.submitQuiz() })

      expect(quizService.submitAnswers).toHaveBeenCalledWith({
        favorites: { singer: 'Taylor Swift' },
        preferences: { coffee: 'Café' },
        description: 'Genial',
      })
    })
  })

  // ─── exposed state ──────────────────────────────────────────────────────────

  describe('exposed state', () => {
    it('exposes playerName from the store', () => {
      useQuizStore.getState().setPlayerName('Milena')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.playerName).toBe('Milena')
    })

    it('exposes answers from the store', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor')
      const { result } = renderHook(() => useQuiz())
      expect(result.current.answers.favorites.singer).toBe('Taylor')
    })
  })
})
