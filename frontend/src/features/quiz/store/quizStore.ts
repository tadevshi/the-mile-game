import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tipos
export interface QuizAnswers {
  favorites: Record<string, string>;
  preferences: Record<string, string>;
  description: string;
}

export interface QuizState {
  // Datos del jugador
  playerName: string;
  setPlayerName: (name: string) => void;
  
  // Respuestas del quiz
  answers: QuizAnswers;
  setFavoriteAnswer: (id: string, value: string) => void;
  setPreferenceAnswer: (id: string, value: string) => void;
  setDescription: (value: string) => void;
  
  // Estado del juego
  hasCompleted: boolean;
  score: number;
  setCompleted: (completed: boolean) => void;
  setScore: (score: number) => void;
  
  // Reset
  resetQuiz: () => void;
}

// Store con persistencia en localStorage
export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      // Estado inicial
      playerName: '',
      answers: {
        favorites: {},
        preferences: {},
        description: '',
      },
      hasCompleted: false,
      score: 0,

      // Actions
      setPlayerName: (name) => set({ playerName: name }),
      
      setFavoriteAnswer: (id, value) =>
        set((state) => ({
          answers: {
            ...state.answers,
            favorites: { ...state.answers.favorites, [id]: value },
          },
        })),
      
      setPreferenceAnswer: (id, value) =>
        set((state) => ({
          answers: {
            ...state.answers,
            preferences: { ...state.answers.preferences, [id]: value },
          },
        })),
      
      setDescription: (value) =>
        set((state) => ({
          answers: { ...state.answers, description: value },
        })),
      
      setCompleted: (completed) => set({ hasCompleted: completed }),
      
      setScore: (score) => set({ score }),
      
      resetQuiz: () =>
        set({
          playerName: '',
          answers: {
            favorites: {},
            preferences: {},
            description: '',
          },
          hasCompleted: false,
          score: 0,
        }),
    }),
    {
      name: 'mile-game-storage', // nombre en localStorage
    }
  )
);

// Hook helper para acceder fácilmente al store
export const usePlayerName = () => useQuizStore((state) => state.playerName);
export const useQuizAnswers = () => useQuizStore((state) => state.answers);
export const useQuizScore = () => useQuizStore((state) => state.score);
export const useHasCompleted = () => useQuizStore((state) => state.hasCompleted);
