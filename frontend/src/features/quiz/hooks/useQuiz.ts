import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizStore } from '../store/quizStore';
import { quizService } from '../services/quizApi';

export function useQuiz() {
  const navigate = useNavigate();
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
  const totalFavorites = Object.keys(answers.favorites).length;
  const totalPreferences = Object.keys(answers.preferences).length;
  const totalDescription = 1; // single description question
  const totalQuestions = totalFavorites + totalPreferences + totalDescription;
  const answeredFavorites = Object.values(answers.favorites).filter((v) => v.trim() !== '').length;
  const answeredPreferences = Object.values(answers.preferences).filter((v) => v !== '').length;
  const answeredDescription = answers.description.trim() !== '' ? 1 : 0;
  const progress = {
    current: answeredFavorites + answeredPreferences + answeredDescription,
    total: totalQuestions,
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
