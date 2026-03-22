import { useState } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { useQuizStore } from '../store/quizStore';
import { quizService } from '../services/quizApi';
import { useEventStore } from '@/shared/store/eventStore';
import { api } from '@/shared/lib/api';
import type { QuizQuestionResponse } from '../types/quiz-player.types';
import type { AxiosError } from 'axios';

export function useQuiz(questions: QuizQuestionResponse[] = []) {
  const navigate = useEventNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentEvent } = useEventStore();

  // Store state
  const answers = useQuizStore((state) => state.answers);
  const playerName = useQuizStore((state) => state.playerName);
  const setFavoriteAnswer = useQuizStore((state) => state.setFavoriteAnswer);
  const setPreferenceAnswer = useQuizStore((state) => state.setPreferenceAnswer);
  const setDescription = useQuizStore((state) => state.setDescription);
  const setScore = useQuizStore((state) => state.setScore);
  const setCompleted = useQuizStore((state) => state.setCompleted);

  // Derived: progress basado en preguntas REALES de la API
  const favoriteQuestions = questions.filter((q) => q.section === 'favorites');
  const preferenceQuestions = questions.filter((q) => q.section === 'preferences');
  const hasDescription = questions.some((q) => q.section === 'description');

  const answeredFavorites = favoriteQuestions.filter(
    (q) => (answers.favorites[q.key] ?? '').trim() !== ''
  ).length;
  const answeredPreferences = preferenceQuestions.filter(
    (q) => (answers.preferences[q.key] ?? '') !== ''
  ).length;
  const answeredDescription = answers.description.trim() !== '' ? 1 : 0;
  const totalQuestions = favoriteQuestions.length + preferenceQuestions.length + (hasDescription ? 1 : 0);

  const progress = {
    current: answeredFavorites + answeredPreferences + answeredDescription,
    total: totalQuestions || 1,
  };

  const submitQuiz = async () => {
    setIsLoading(true);
    setError('');

    try {
      const eventSlug = currentEvent?.slug;
      if (!eventSlug) {
        setError('No se encontró el evento. Intenta recargar la página.');
        setIsLoading(false);
        return;
      }

      // Construir payload con las keys de las preguntas reales
      const favorites: Record<string, string> = {};
      const preferences: Record<string, string> = {};

      favoriteQuestions.forEach((q) => {
        if (answers.favorites[q.key]) {
          favorites[q.key] = answers.favorites[q.key];
        }
      });

      preferenceQuestions.forEach((q) => {
        if (answers.preferences[q.key]) {
          preferences[q.key] = answers.preferences[q.key];
        }
      });

      const response = await quizService.submitAnswersScoped(eventSlug, {
        favorites,
        preferences,
        description: answers.description,
      });

      setScore(response.score);
      setCompleted(true);

      navigate('/thank-you');
    } catch (err) {
      console.error('Error submitting quiz:', err);
      
      // Manejar error 403 específico: player no pertenece al evento
      const axiosError = err as AxiosError<{ error?: string }>;
      if (axiosError.response?.status === 403) {
        const errorMessage = axiosError.response?.data?.error || '';
        if (errorMessage.includes('Player does not belong to this event')) {
          // Limpiar player y redirigir a registro
          api.clearPlayerId();
          useQuizStore.getState().resetQuiz();
          setError('Parece que no estás registrado para este evento. Necesitás registrarte para jugar.');
          setTimeout(() => {
            navigate('/register');
          }, 2000);
          return;
        }
      }
      
      setError('Error al enviar respuestas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    answers,
    playerName,
    isLoading,
    error,
    progress,
    setFavoriteAnswer,
    setPreferenceAnswer,
    setDescription,
    submitQuiz,
  };
}
