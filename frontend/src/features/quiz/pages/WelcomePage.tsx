import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Header, PageLayout, Card, ScrollReveal } from '@/shared';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <PageLayout background="butterfly-animated" showSparkles={false}>
      <div className="flex flex-col items-center min-h-screen px-8 py-12 text-center">
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
            title="¡Bienvenidos a mi Cumpleaños!"
            subtitle="Mágica Celebración"
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
            {/* Placeholder para la foto de Mile */}
            <motion.div 
              className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="font-display text-6xl text-white">M</span>
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

          <p className="text-gray-400 dark:text-gray-500 text-xs italic tracking-wide">
            Prepárate para la diversión
          </p>
        </ScrollReveal>
      </div>
    </PageLayout>
  );
}
