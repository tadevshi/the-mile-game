import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { useEventStore } from '@/shared/store/eventStore';
import { motion } from 'framer-motion';
import { Button, Header, PageLayout, Card, ScrollReveal, useFeatureEnabled } from '@/shared';
import { useQuizStore } from '../store/quizStore';

export function WelcomePage() {
  const navigate = useEventNavigate();
  const hasCompleted = useQuizStore((s) => s.hasCompleted);
  const { currentEvent } = useEventStore();
  const isCorkboardEnabled = useFeatureEnabled('corkboard');

  // El currentEvent ya debería estar cargado por el router (useEventRoutes)
  // No hacer fallback hardcodeado a mile-2026 — dejar que falle si no hay evento

  return (
    <PageLayout background="butterfly-animated" showSparkles={false} themeId={currentEvent?.themeId}>
      <div className="flex flex-col items-center flex-1 px-8 py-12 text-center">
        {/* Sección superior - Título */}
        <ScrollReveal variant="fadeDown" className="w-full h-1/3 flex flex-col items-center justify-center relative mt-4">
          {/* Decoración mariposas SVG */}
          <motion.div 
            className="absolute -top-4 -left-2 opacity-80"
            animate={{ rotate: [-12, -5, -12], y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="text-primary w-12 h-12" fill="currentColor" viewBox="0 0 100 100">
              <path d="M50 50 C 70 20, 100 30, 95 60 C 90 80, 60 70, 50 60 C 40 70, 10 80, 5 60 C 0 30, 30 20, 50 50" />
            </svg>
          </motion.div>
          <motion.div 
            className="absolute -bottom-2 -right-2 opacity-60 scale-75"
            animate={{ rotate: [45, 55, 45], y: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="text-accent w-14 h-14" fill="currentColor" viewBox="0 0 100 100">
              <path d="M50 50 C 70 20, 100 30, 95 60 C 90 80, 60 70, 50 60 C 40 70, 10 80, 5 60 C 0 30, 30 20, 50 50" />
            </svg>
          </motion.div>

          <Header
            title={currentEvent ? `¡Bienvenidos a ${currentEvent.name}!` : '¡Bienvenidos!'}
            subtitle={currentEvent?.description || 'Mágica Celebración'}
            size="lg"
            decoration="lines"
          />
        </ScrollReveal>

        {/* Sección central - Imagen */}
        <ScrollReveal variant="scaleUp" className="flex-1 flex items-center justify-center py-6" delay={0.2}>
          <Card variant="glass" padding="lg" className="rounded-full p-4 relative">
            <motion.div 
              className="absolute inset-0 border-2 border-primary/20 rounded-full scale-105"
              animate={{ scale: [1.05, 1.1, 1.05], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Foto del evento */}
            <motion.div
              className="w-40 h-40 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={currentEvent?.name ? `/princess_logo.png` : '/princess_logo.png'}
                alt={currentEvent?.name ?? 'Evento'}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </motion.div>
          </Card>
        </ScrollReveal>

        {/* Sección inferior - CTA */}
        <ScrollReveal variant="fadeUp" className="w-full max-w-sm space-y-6 pb-8" delay={0.4}>
          <div className="space-y-1">
            <p className="font-serif italic text-2xl text-accent dark:text-primary">
              ¿Qué tanto me conoces?
            </p>
            <div className="flex justify-center gap-1">
              <motion.div 
                className="h-1 w-10 bg-primary/60 rounded-full"
                animate={{ width: [40, 60, 40] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="h-1 w-1 bg-primary/30 rounded-full" />
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<span>→</span>}
            onClick={() => navigate('/register')}
          >
            Empezar Juego
          </Button>

          {/* Botón condicional: Dejar foto en cartelera (solo si ya jugó Y feature habilitado) */}
          {isCorkboardEnabled && hasCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="outline"
                size="md"
                fullWidth
                icon={<span>📸</span>}
                onClick={() => navigate('/corkboard?add=true')}
                className="!border-primary/50 !text-primary hover:!bg-primary/10"
              >
                Dejar tu Foto para {currentEvent?.name ?? 'el festejado'}
              </Button>
            </motion.div>
          )}

          <p className="text-gray-400 dark:text-gray-500 text-xs italic tracking-wide">
            Prepárate para la diversión
          </p>
        </ScrollReveal>
      </div>
    </PageLayout>
  );
}
