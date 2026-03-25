import { useEffect, useState } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { motion } from 'framer-motion';
import { Button, Input, TextArea, Header, PageLayout, ScrollReveal, ScrollStagger, ScrollStaggerItem } from '@/shared';
import { useQuiz } from '../hooks/useQuiz';
import { useQuizStore } from '../store/quizStore';
import { useEventStore } from '@/shared/store/eventStore';
import { api } from '@/shared/lib/api';
import type { QuizQuestionResponse } from '../types/quiz-player.types';

// ProgressBar completo
function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span 
          className="font-serif"
          style={{ color: 'var(--color-on-surface-muted)' }}
        >
          Progreso
        </span>
        <span className="font-bold text-primary">
          {current} de {total}
        </span>
      </div>
      <div 
        className="h-3 w-full rounded-full overflow-hidden shadow-inner"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ProgressBar minimalista (sticky)
function ProgressBarMinimal({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 h-1 backdrop-blur-sm"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-light) 80%, transparent)' }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(236,72,153,0.5)]"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

// Empty state cuando no hay preguntas configuradas
function NoQuestionsState({ themeId }: { themeId?: string }) {
  const navigate = useEventNavigate();

  return (
    <PageLayout background="butterfly-animated" showSparkles={false} themeId={themeId}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center min-h-[70vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <span className="text-5xl">📝</span>
        </motion.div>
        
        <Header
          title="¡Ups!"
          subtitle="No hay preguntas para este quiz"
          size="md"
          decoration="dots"
        />
        
        <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-xs">
          Este evento todavía no tiene preguntas configuradas.
          <br />
          <span className="text-sm text-slate-400">
            El organizador puede agregar preguntas desde el panel de administración.
          </span>
        </p>

        <Button
          variant="outline"
          size="lg"
          className="mt-8"
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </Button>
      </div>
    </PageLayout>
  );
}

export function QuizPage() {
  const navigate = useEventNavigate();
  const [hydrated, setHydrated] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestionResponse[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const { currentEvent } = useEventStore();

  const {
    answers,
    playerName,
    isLoading,
    error,
    progress,
    setFavoriteAnswer,
    setPreferenceAnswer,
    setDescription,
    submitQuiz,
  } = useQuiz(questions);

  // Wait for Zustand persist to rehydrate from localStorage before redirecting
  useEffect(() => {
    const unsub = useQuizStore.persist.onFinishHydration(() => setHydrated(true));
    if (useQuizStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // Si no hay nombre de jugador o el player no pertenece al evento actual, redirigir a registro
  // IMPORTANTE: No llamar resetQuiz() aquí porque causa un loop infinito:
  // 1. resetQuiz() actualiza el store
  // 2. Esto causa re-render
  // 3. El useEffect se ejecuta de nuevo
  // 4. Navega a /register
  // 5. El ciclo se repite
  // La solución: solo navegar, el store se limpió en el caso anterior
  useEffect(() => {
    if (!hydrated || !currentEvent?.slug) return;
    
    // Verificar si el player guardado pertenece al evento actual
    const isPlayerForThisEvent = api.isPlayerForEvent(currentEvent.slug);
    
    if (!playerName || !isPlayerForThisEvent) {
      // Limpiar player solo si no pertenece al evento actual
      // NO llamar resetQuiz() aquí - solo limpiar localStorage
      if (!isPlayerForThisEvent) {
        api.clearPlayerId();
        // El store retaindrá datos pero el playerId ya no existe en localStorage
        // La próxima vez que alguien se registre, se creará un nuevo player
      }
      navigate('/register');
    }
  }, [hydrated, playerName, currentEvent?.slug, navigate]);

  // Cargar preguntas desde la API del evento
  useEffect(() => {
    if (!currentEvent?.slug) return;

    setLoadingQuestions(true);

    api.getQuizQuestionsScoped(currentEvent.slug)
      .then((response) => {
        setQuestions(response.questions ?? []);
      })
      .catch((err) => {
        console.error('Error loading quiz questions:', err);
        // Si el evento no existe o hay error de red, questions queda vacío
        setQuestions([]);
      })
      .finally(() => {
        setLoadingQuestions(false);
      });
  }, [currentEvent?.slug]);

  // Si las preguntas están cargando, mostrar loading
  if (loadingQuestions) {
    return (
      <PageLayout background="butterfly-animated" showSparkles={false} themeId={currentEvent?.themeId}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20" />
            <div className="h-6 w-48 bg-primary/20 rounded-full" />
            <div className="h-4 w-32 bg-primary/10 rounded-full" />
          </div>
          <p className="mt-6 text-slate-500 text-sm">Cargando preguntas...</p>
        </div>
      </PageLayout>
    );
  }

  // Si no hay preguntas, mostrar estado vacío
  if (questions.length === 0) {
    return <NoQuestionsState themeId={currentEvent?.themeId} />;
  }

  // Separar preguntas por sección
  const favoriteQuestions = questions.filter((q) => q.section === 'favorites');
  const preferenceQuestions = questions.filter((q) => q.section === 'preferences');

  const totalQuestions = favoriteQuestions.length + preferenceQuestions.length + (questions.some((q) => q.section === 'description') ? 1 : 0);

  return (
    <PageLayout background="butterfly-animated" showSparkles={false} themeId={currentEvent?.themeId}>
      {/* Progress bar minimalista sticky */}
      <ProgressBarMinimal current={progress.current} total={totalQuestions || 1} />

      <div className="flex-1 px-6 py-8 pb-24 pt-10">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <ScrollReveal variant="fadeDown" className="text-center space-y-4">
            <Header
              title="¡Juguemos!"
              subtitle={`¿Qué tanto conocés a ${currentEvent?.name ?? 'la cumpleañera'}, ${playerName}?`}
              size="md"
              decoration="dots"
            />

            {/* Progress Bar */}
            <ProgressBar current={progress.current} total={totalQuestions || 1} />
          </ScrollReveal>

          {/* Error message */}
          {error && (
            <div 
              className="px-4 py-3 rounded"
              style={{ 
                backgroundColor: 'var(--color-error-light)',
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              {error}
            </div>
          )}

          {/* Sección 1: Favoritos */}
          {favoriteQuestions.length > 0 && (
            <ScrollReveal variant="fadeUp">
              <ScrollStagger className="space-y-5">
                {favoriteQuestions.map((q) => (
                  <ScrollStaggerItem key={q.id}>
                    <Input
                      label={q.question_text}
                      placeholder="Escribe aquí..."
                      value={answers.favorites[q.key] || ''}
                      onChange={(e) => setFavoriteAnswer(q.key, e.target.value)}
                      disabled={isLoading}
                    />
                  </ScrollStaggerItem>
                ))}
              </ScrollStagger>
            </ScrollReveal>
          )}

          {/* Sección 2: Preferencias (This or That) */}
          {preferenceQuestions.length > 0 && (
            <ScrollReveal variant="fadeUp" delay={0.1}>
              <section className="space-y-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
                  <span 
                    className="font-serif italic px-4 text-lg"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    ¿Qué prefiere?
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary" />
                </div>

                <ScrollStagger className="flex flex-col gap-4">
                  {preferenceQuestions.map((q) => (
                    <ScrollStaggerItem key={q.id}>
                      <div className="flex items-center gap-3">
                        <span className="font-serif italic text-sm text-slate-600 dark:text-slate-300 w-32 shrink-0 text-right leading-tight">
                          {q.question_text}
                        </span>

                        <div className="flex gap-2 flex-1">
                          {(q.options ?? []).map((opt) => {
                            const isSelected = answers.preferences[q.key] === opt;
                            return (
                              <motion.button
                                key={opt}
                                onClick={() => !isLoading && setPreferenceAnswer(q.key, opt)}
                                className={`flex-1 py-2 px-3 rounded-full border-2 text-sm font-semibold transition-colors ${
                                  isSelected
                                    ? 'text-white'
                                    : ''
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{
                                  backgroundColor: isSelected ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-primary)',
                                  color: isSelected ? 'var(--color-on-accent)' : 'var(--color-primary)',
                                }}
                                whileTap={isLoading ? {} : { scale: 0.95 }}
                                animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                disabled={isLoading}
                              >
                                {opt}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </ScrollStaggerItem>
                  ))}
                </ScrollStagger>
              </section>
            </ScrollReveal>
          )}

          {/* Sección 3: Descripción */}
          {questions.some((q) => q.section === 'description') && (
            <ScrollReveal variant="fadeUp" delay={0.2}>
              <section className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
                  <span 
                    className="font-serif italic px-4 text-lg"
                    style={{ color: 'var(--color-accent)' }}
                  >
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
            </ScrollReveal>
          )}

          {/* Botón enviar */}
          <ScrollReveal variant="scaleUp" delay={0.3}>
            <div className="pt-4">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<span>✉</span>}
                onClick={submitQuiz}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Respuestas'}
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </PageLayout>
  );
}
