import { useEffect, useState } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { motion } from 'framer-motion';
import { Button, Input, TextArea, Header, PageLayout, ScrollReveal, ScrollStagger, ScrollStaggerItem } from '@/shared';
import { useQuiz } from '../hooks/useQuiz';
import { useQuizStore } from '../store/quizStore';
import { FAVORITE_QUESTIONS, PREFERENCE_QUESTIONS } from '../types/quiz.constants';

// Componente ProgressBar completo
function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-serif text-slate-600 dark:text-slate-300">
          Progreso
        </span>
        <span className="font-bold text-primary">
          {current} de {total}
        </span>
      </div>
      <div className="h-3 w-full bg-pink-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
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

// Componente ProgressBar minimalista (sticky)
function ProgressBarMinimal({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-pink-100/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <motion.div
        className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(236,72,153,0.5)]"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

// Preguntas del quiz — definidas en quiz.constants.ts, importadas aquí

export function QuizPage() {
  const navigate = useEventNavigate();
  const [hydrated, setHydrated] = useState(false);
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
  } = useQuiz();

  // Wait for Zustand persist to rehydrate from localStorage before redirecting
  useEffect(() => {
    const unsub = useQuizStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (e.g. navigated in-app), mark immediately
    if (useQuizStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // Si no hay nombre de jugador, redirigir a registro
  useEffect(() => {
    if (hydrated && !playerName) {
      navigate('/register');
    }
  }, [hydrated, playerName, navigate]);

  return (
    <PageLayout background="butterfly-animated" showSparkles={false}>
      {/* Progress bar minimalista sticky */}
      <ProgressBarMinimal current={progress.current} total={progress.total} />

      <div className="flex-1 px-6 py-8 pb-24 pt-10">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <ScrollReveal variant="fadeDown" className="text-center space-y-4">
            <Header
              title="¡Juguemos!"
              subtitle={`¿Qué tanto conoces a Mile, ${playerName}?`}
              size="md"
              decoration="dots"
            />

            {/* Progress Bar */}
            <ProgressBar current={progress.current} total={progress.total} />
          </ScrollReveal>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Sección 1: Favoritos */}
          <ScrollReveal variant="fadeUp">
            <ScrollStagger className="space-y-5">
              {FAVORITE_QUESTIONS.map((q) => (
                <ScrollStaggerItem key={q.id}>
                  <Input
                    label={q.label}
                    placeholder="Escribe aquí..."
                    value={answers.favorites[q.id] || ''}
                    onChange={(e) => setFavoriteAnswer(q.id, e.target.value)}
                    disabled={isLoading}
                  />
                </ScrollStaggerItem>
              ))}
            </ScrollStagger>
          </ScrollReveal>

          {/* Sección 2: Preferencias (This or That) */}
          <ScrollReveal variant="fadeUp" delay={0.1}>
            <section className="space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
                <span className="font-serif italic text-accent dark:text-primary px-4 text-lg">
                  ¿Qué prefiere la cumpleañera?
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary" />
              </div>

              <ScrollStagger className="flex flex-col gap-4">
                {PREFERENCE_QUESTIONS.map((q) => (
                  <ScrollStaggerItem key={q.id}>
                    <div className="flex items-center gap-3">
                      {/* Label de la pregunta */}
                      <span className="font-serif italic text-sm text-slate-600 dark:text-slate-300 w-32 shrink-0 text-right leading-tight">
                        {q.label}
                      </span>

                      {/* Pills con texto */}
                      <div className="flex gap-2 flex-1">
                        {q.options.map((opt) => {
                          const isSelected = answers.preferences[q.id] === opt;
                          return (
                            <motion.button
                              key={opt}
                              onClick={() => !isLoading && setPreferenceAnswer(q.id, opt)}
                              className={`flex-1 py-2 px-3 rounded-full border-2 text-sm font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-accent border-accent text-white'
                                  : 'border-primary text-primary bg-white/60 dark:bg-slate-800/60 hover:bg-primary/10'
                              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {/* Sección 3: Descripción */}
          <ScrollReveal variant="fadeUp" delay={0.2}>
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
          </ScrollReveal>

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
