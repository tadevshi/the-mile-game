import { useState } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { useQuizStore } from '../store/quizStore';
import { quizService } from '../services/quizApi';
import { TOTAL_QUESTIONS, FAVORITE_QUESTIONS, PREFERENCE_QUESTIONS } from '../types/quiz.constants';

export function useQuiz() {
  const navigate = useEventNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Store state
  const answers = useQuizStore((state) => state.answers);
  const playerName = useQuizStore((state) => state.playerName);
  const setFavoriteAnswer = useQuizStore((state) => state.setFavoriteAnswer);
  const setPreferenceAnswer = useQuizStore((state) => state.setPreferenceAnswer);
  const setDescription = useQuizStore((state) => state.setDescription);
  const setScore = useQuizStore((state) => state.setScore);
  const setCompleted = useQuizStore((state) => state.setCompleted);

  // Derived: progress
  // IMPORTANTE: el total es FIJO — no se calcula desde las keys del objeto answers
  // porque ese objeto crece a medida que el usuario responde, haciendo que el
  // total cambie dinámicamente y el progreso muestre "1 de 2", "2 de 3", etc.
  const answeredFavorites = FAVORITE_QUESTIONS.filter(
    (q) => (answers.favorites[q.id] ?? '').trim() !== ''
  ).length;
  const answeredPreferences = PREFERENCE_QUESTIONS.filter(
    (q) => (answers.preferences[q.id] ?? '') !== ''
  ).length;
  const answeredDescription = answers.description.trim() !== '' ? 1 : 0;
  const progress = {
    current: answeredFavorites + answeredPreferences + answeredDescription,
    total: TOTAL_QUESTIONS,
  };

  const submitQuiz = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await quizService.submitAnswers({
        favorites: answers.favorites,
        preferences: answers.preferences,
        description: answers.description,
      });

      setScore(response.score);
      setCompleted(true);

      navigate('/thank-you');
    } catch (err) {
      console.error('Error submitting quiz:', err);
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
