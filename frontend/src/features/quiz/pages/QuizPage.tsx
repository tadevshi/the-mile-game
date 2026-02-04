import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, TextArea, Header, PageLayout } from '@/shared';
import { useQuizStore } from '../store/quizStore';
import { api } from '@/shared/lib/api';

// Preguntas del quiz
const favoriteQuestions = [
  { id: 'singer', label: '¿Cantante favorito?' },
  { id: 'flower', label: '¿Flor favorita?' },
  { id: 'drink', label: '¿Cuál es mi bebida favorita?' },
  { id: 'disney', label: '¿Película de Disney favorita?' },
  { id: 'season', label: '¿Estación del año preferida?' },
  { id: 'color', label: '¿Cuál es mi color favorito?' },
  { id: 'dislike', label: '¿Menciona algo que no me guste?' },
];

const preferenceQuestions = [
  { id: 'coffee', label: '¿Café o Té?', options: ['Café', 'Té'] },
  { id: 'place', label: '¿Playa o Montaña?', options: ['Playa', 'Montaña'] },
  { id: 'weather', label: '¿Frío o Calor?', options: ['Frío', 'Calor'] },
  { id: 'time', label: '¿Día o Noche?', options: ['Día', 'Noche'] },
  { id: 'food', label: '¿Pizza o Sushi?', options: ['Pizza', 'Sushi'] },
  { id: 'drink', label: '¿Tequila o Vino?', options: ['Tequila', 'Vino'] },
];

export function QuizPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Zustand store - seleccionamos solo lo que necesitamos
  const answers = useQuizStore((state) => state.answers);
  const playerName = useQuizStore((state) => state.playerName);
  const setFavoriteAnswer = useQuizStore((state) => state.setFavoriteAnswer);
  const setPreferenceAnswer = useQuizStore((state) => state.setPreferenceAnswer);
  const setDescription = useQuizStore((state) => state.setDescription);
  const setScore = useQuizStore((state) => state.setScore);
  const setCompleted = useQuizStore((state) => state.setCompleted);

  // Si no hay nombre de jugador, redirigir a registro
  useEffect(() => {
    if (!playerName) {
      navigate('/register');
    }
  }, [playerName, navigate]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Enviar respuestas al backend
      const response = await api.submitQuiz({
        favorites: answers.favorites,
        preferences: answers.preferences,
        description: answers.description,
      });

      // Guardar puntaje en el store
      setScore(response.score);

      // Marcar como completado
      setCompleted(true);

      console.log('Quiz submitted! Score:', response.score);

      navigate('/thank-you');
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Error al enviar respuestas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout background="butterfly" showSparkles={false}>
      <div className="min-h-screen px-6 py-8 pb-24">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <Header
              title="¡Juguemos!"
              subtitle={`¿Qué tanto conoces a Mile, ${playerName}?`}
              size="md"
              decoration="dots"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Sección 1: Favoritos */}
          <section className="space-y-5">
            {favoriteQuestions.map((q) => (
              <Input
                key={q.id}
                label={q.label}
                placeholder="Escribe aquí..."
                value={answers.favorites[q.id] || ''}
                onChange={(e) => setFavoriteAnswer(q.id, e.target.value)}
                disabled={isLoading}
              />
            ))}
          </section>

          {/* Sección 2: Preferencias (This or That) */}
          <section className="space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
              <span className="font-serif italic text-accent dark:text-primary px-4 text-lg">
                ¿Qué prefiere la cumpleañera?
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary" />
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {preferenceQuestions.map((q) => (
                <div key={q.id} className="flex flex-col items-center space-y-3">
                  <span className="font-serif italic text-base text-slate-700 dark:text-slate-200">
                    {q.label}
                  </span>
                  <div className="flex space-x-4">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => !isLoading && setPreferenceAnswer(q.id, opt)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          answers.preferences[q.id] === opt
                            ? 'bg-accent border-accent scale-110'
                            : 'border-primary hover:bg-primary/20'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={opt}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 3: Descripción */}
          <section className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
              <span className="font-serif italic text-accent dark:text-primary px-4 text-lg">
                Descríbeme en una oración
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary" />
            </div>

            <TextArea
              placeholder="Eres una persona..."
              value={answers.description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </section>

          {/* Botón enviar - Sin mostrar puntaje */}
          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<span>✉</span>}
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar Respuestas'}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
