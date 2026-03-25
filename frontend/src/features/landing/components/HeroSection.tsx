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
    const input = document.getElementById('event-code-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-16 overflow-hidden">
      {/* Background gradient - uses CSS variable for theme-aware background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom right, var(--color-background), var(--color-background-alt), var(--color-background))',
          opacity: 0.95,
        }}
      />
      
      {/* Decorative elements */}
      <div 
        className="absolute top-16 md:top-20 left-4 md:left-10 w-24 md:w-32 h-24 md:h-32 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--color-primary)', opacity: 0.15 }}
      />
      <div 
        className="absolute bottom-16 md:bottom-20 right-4 md:right-10 w-32 md:w-40 h-32 md:h-40 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--color-accent)', opacity: 0.15 }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto text-center"
      >
        {/* Logo / Brand */}
        <motion.div variants={itemVariants} className="mb-4 md:mb-6">
          <div 
            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 backdrop-blur-sm rounded-full shadow-sm border"
            style={{ 
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border-light)',
            }}
          >
            <Sparkles 
              className="w-4 h-4 md:w-5 md:h-5" 
              style={{ color: 'var(--color-primary)' }} 
            />
            <span 
              className="text-xs md:text-sm font-medium"
              style={{ color: 'var(--color-on-surface)' }}
            >
              Plataforma de eventos interactivos
            </span>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-7xl font-display mb-2 md:mb-4"
        >
          <span 
            className="bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-accent), var(--color-primary))',
              color: 'transparent',
            }}
          >
            EventHub
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-2xl mb-2 md:mb-4 font-serif"
          style={{ color: 'var(--color-on-background)' }}
        >
          Creá experiencias memorables
        </motion.p>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-sm md:text-base mb-8 md:mb-10 max-w-2xl mx-auto px-4"
          style={{ color: 'var(--color-on-surface-muted)' }}
        >
          Organizá eventos únicos con quizzes interactivos, carteleras de fotos y 
          cajas secretas. Todo en un solo lugar, fácil de compartir.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8 md:mb-12 px-4"
        >
          <Button onClick={handleCreateEvent}>
            <PartyPopper className="w-4 h-4 md:w-5 md:h-5" />
            Crear Evento
          </Button>

          <Button onClick={handleJoinEvent} variant="outline">
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
            <p 
              className="text-2xl md:text-3xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              100+
            </p>
            <p 
              className="text-xs md:text-sm"
              style={{ color: 'var(--color-on-surface-muted)' }}
            >
              Eventos creados
            </p>
          </div>
          <div 
            className="w-px h-10 md:h-12 hidden sm:block"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div>
            <p 
              className="text-2xl md:text-3xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              50+
            </p>
            <p 
              className="text-xs md:text-sm"
              style={{ color: 'var(--color-on-surface-muted)' }}
            >
              Invitados por evento
            </p>
          </div>
          <div 
            className="w-px h-10 md:h-12 hidden sm:block"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div>
            <p 
              className="text-2xl md:text-3xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              4.9★
            </p>
            <p 
              className="text-xs md:text-sm"
              style={{ color: 'var(--color-on-surface-muted)' }}
            >
              Satisfacción
            </p>
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
            className="w-6 h-10 rounded-full flex items-start justify-center p-1"
            style={{ borderColor: 'var(--color-primary)' }}
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-3 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
