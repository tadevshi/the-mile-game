import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, PartyPopper, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { useLandingStore } from '../store/landingStore';
import { useAuthStore } from '@/features/auth/store/authStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function HeroSection() {
  const navigate = useNavigate();
  const { trackCTA } = useLandingStore();
  const { isAuthenticated } = useAuthStore();

  const handleCreateEvent = () => {
    trackCTA('create');
    if (isAuthenticated) {
      navigate('/events/new');
    } else {
      navigate('/register');
    }
  };

  const handleJoinEvent = () => {
    trackCTA('join');
    // Focus on event code input
    const input = document.getElementById('event-code-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
      
      {/* Decorative elements */}
      <div className="absolute top-16 md:top-20 left-4 md:left-10 w-24 md:w-32 h-24 md:h-32 bg-pink-300/30 rounded-full blur-3xl" />
      <div className="absolute bottom-16 md:bottom-20 right-4 md:right-10 w-32 md:w-40 h-32 md:h-40 bg-rose-300/30 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-20 md:w-24 h-20 md:h-24 bg-pink-200/40 rounded-full blur-2xl hidden sm:block" />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto text-center"
      >
        {/* Logo / Brand */}
        <motion.div variants={itemVariants} className="mb-4 md:mb-6">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full shadow-sm border border-pink-100 dark:border-slate-700">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
            <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">
              Plataforma de eventos interactivos
            </span>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-7xl font-display mb-2 md:mb-4"
        >
          <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent dark:from-pink-400 dark:via-rose-400 dark:to-pink-500">
            EventHub
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-2xl text-gray-600 dark:text-gray-300 mb-2 md:mb-4 font-serif"
        >
          Creá experiencias memorables
        </motion.p>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto px-4"
        >
          Organizá eventos únicos con quizzes interactivos, carteleras de fotos y 
          cajas secretas. Todo en un solo lugar, fácil de compartir.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8 md:mb-12 px-4"
        >
          <Button
            onClick={handleCreateEvent}
            className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-200 dark:shadow-pink-900/50"
          >
            <PartyPopper className="w-4 h-4 md:w-5 md:h-5" />
            Crear Evento
          </Button>

          <Button
            onClick={handleJoinEvent}
            variant="outline"
            className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg border-2 border-pink-300 dark:border-pink-700 hover:bg-pink-50 dark:hover:bg-pink-900/30"
          >
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            Ingresar a Evento
          </Button>
        </motion.div>

        {/* Social proof / Stats */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-center px-4"
        >
          <div>
            <p className="text-2xl md:text-3xl font-bold text-pink-600 dark:text-pink-400">100+</p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Eventos creados</p>
          </div>
          <div className="w-px h-10 md:h-12 bg-pink-200 dark:bg-slate-700 hidden sm:block" />
          <div>
            <p className="text-2xl md:text-3xl font-bold text-pink-600 dark:text-pink-400">50+</p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Invitados por evento</p>
          </div>
          <div className="w-px h-10 md:h-12 bg-pink-200 dark:bg-slate-700 hidden sm:block" />
          <div>
            <p className="text-2xl md:text-3xl font-bold text-pink-600 dark:text-pink-400">4.9★</p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Satisfacción</p>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          variants={itemVariants}
          className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 border-2 border-pink-300 dark:border-pink-700 rounded-full flex items-start justify-center p-1"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-3 bg-pink-400 dark:bg-pink-500 rounded-full"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
