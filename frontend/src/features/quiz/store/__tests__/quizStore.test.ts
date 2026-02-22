import { describe, it, expect, beforeEach } from 'vitest'
import { useQuizStore } from '../quizStore'

const INITIAL_STATE = {
  playerName: '',
  answers: {
    favorites: {},
    preferences: {},
    description: '',
  },
  hasCompleted: false,
  score: 0,
}

describe('quizStore', () => {
  beforeEach(() => {
    useQuizStore.setState(INITIAL_STATE)
    localStorage.clear()
  })

  describe('initial state', () => {
    it('has empty playerName', () => {
      expect(useQuizStore.getState().playerName).toBe('')
    })

    it('has empty answers', () => {
      const { answers } = useQuizStore.getState()
      expect(answers.favorites).toEqual({})
      expect(answers.preferences).toEqual({})
      expect(answers.description).toBe('')
    })

    it('has hasCompleted as false', () => {
      expect(useQuizStore.getState().hasCompleted).toBe(false)
    })

    it('has score of 0', () => {
      expect(useQuizStore.getState().score).toBe(0)
    })
  })

  describe('setPlayerName', () => {
    it('updates playerName', () => {
      useQuizStore.getState().setPlayerName('Ana')
      expect(useQuizStore.getState().playerName).toBe('Ana')
    })

    it('overwrites previous playerName', () => {
      useQuizStore.getState().setPlayerName('Ana')
      useQuizStore.getState().setPlayerName('Carla')
      expect(useQuizStore.getState().playerName).toBe('Carla')
    })
  })

  describe('setFavoriteAnswer', () => {
    it('adds a new key to favorites', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      expect(useQuizStore.getState().answers.favorites.singer).toBe('Taylor Swift')
    })

    it('merges multiple keys without losing existing ones', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setFavoriteAnswer('color', 'pink')
      const { favorites } = useQuizStore.getState().answers
      expect(favorites.singer).toBe('Taylor Swift')
      expect(favorites.color).toBe('pink')
    })

    it('updates an existing key', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setFavoriteAnswer('singer', 'Dua Lipa')
      expect(useQuizStore.getState().answers.favorites.singer).toBe('Dua Lipa')
    })

    it('does not touch preferences or description', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee_tea', 'Café')
      useQuizStore.getState().setDescription('Increíble')
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')

      const { answers } = useQuizStore.getState()
      expect(answers.preferences.coffee_tea).toBe('Café')
      expect(answers.description).toBe('Increíble')
    })
  })

  describe('setPreferenceAnswer', () => {
    it('adds a new key to preferences', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee_tea', 'Café')
      expect(useQuizStore.getState().answers.preferences.coffee_tea).toBe('Café')
    })

    it('merges multiple keys without losing existing ones', () => {
      useQuizStore.getState().setPreferenceAnswer('coffee_tea', 'Café')
      useQuizStore.getState().setPreferenceAnswer('beach_mountain', 'Playa')
      const { preferences } = useQuizStore.getState().answers
      expect(preferences.coffee_tea).toBe('Café')
      expect(preferences.beach_mountain).toBe('Playa')
    })

    it('does not touch favorites or description', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setDescription('Genial')
      useQuizStore.getState().setPreferenceAnswer('coffee_tea', 'Café')

      const { answers } = useQuizStore.getState()
      expect(answers.favorites.singer).toBe('Taylor Swift')
      expect(answers.description).toBe('Genial')
    })
  })

  describe('setDescription', () => {
    it('updates description', () => {
      useQuizStore.getState().setDescription('Una persona increíble')
      expect(useQuizStore.getState().answers.description).toBe('Una persona increíble')
    })

    it('does not touch favorites or preferences', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setPreferenceAnswer('coffee_tea', 'Café')
      useQuizStore.getState().setDescription('Genial')

      const { answers } = useQuizStore.getState()
      expect(answers.favorites.singer).toBe('Taylor Swift')
      expect(answers.preferences.coffee_tea).toBe('Café')
    })
  })

  describe('setScore', () => {
    it('updates score', () => {
      useQuizStore.getState().setScore(8)
      expect(useQuizStore.getState().score).toBe(8)
    })

    it('can set score to 0', () => {
      useQuizStore.getState().setScore(10)
      useQuizStore.getState().setScore(0)
      expect(useQuizStore.getState().score).toBe(0)
    })
  })

  describe('setCompleted', () => {
    it('sets hasCompleted to true', () => {
      useQuizStore.getState().setCompleted(true)
      expect(useQuizStore.getState().hasCompleted).toBe(true)
    })

    it('sets hasCompleted back to false', () => {
      useQuizStore.getState().setCompleted(true)
      useQuizStore.getState().setCompleted(false)
      expect(useQuizStore.getState().hasCompleted).toBe(false)
    })
  })

  describe('resetQuiz', () => {
    it('clears playerName', () => {
      useQuizStore.getState().setPlayerName('Ana')
      useQuizStore.getState().resetQuiz()
      expect(useQuizStore.getState().playerName).toBe('')
    })

    it('clears all answers', () => {
      useQuizStore.getState().setFavoriteAnswer('singer', 'Taylor Swift')
      useQuizStore.getState().setPreferenceAnswer('coffee_tea', 'Café')
      useQuizStore.getState().setDescription('Genial')
      useQuizStore.getState().resetQuiz()

      const { answers } = useQuizStore.getState()
      expect(answers.favorites).toEqual({})
      expect(answers.preferences).toEqual({})
      expect(answers.description).toBe('')
    })

    it('resets score to 0', () => {
      useQuizStore.getState().setScore(9)
      useQuizStore.getState().resetQuiz()
      expect(useQuizStore.getState().score).toBe(0)
    })

    it('resets hasCompleted to false', () => {
      useQuizStore.getState().setCompleted(true)
      useQuizStore.getState().resetQuiz()
      expect(useQuizStore.getState().hasCompleted).toBe(false)
    })
  })
})
