import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { PartyPopper, Heart } from 'lucide-react';
import { HeroSection } from '../components/HeroSection';
import { FeaturesGrid } from '../components/FeaturesGrid';
import { EventCodeForm } from '../components/EventCodeForm';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLandingStore } from '../store/landingStore';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { trackCTA } = useLandingStore();

  const handleCreateEvent = () => {
    trackCTA('create');
    if (isAuthenticated) {
      navigate('/events/new');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <HeroSection />

      {/* Features Grid */}
      <FeaturesGrid />

      {/* Event Code Entry Form */}
      <EventCodeForm />

      {/* CTA Section - Create Event */}
      <section id="create-event-section" className="py-20 px-4 bg-gradient-to-b from-white to-pink-50 dark:from-slate-900 dark:to-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-block px-4 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-sm font-medium rounded-full mb-4"
          >
            Empezá hoy
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-display text-gray-800 dark:text-white mb-4">
            ¿Listo para crear tu evento?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            En minutos podés tener tu evento listo con todas las herramientas interactivas. 
            {isAuthenticated ? 'Vas directo al creador de eventos.' : 'Creá una cuenta gratis para empezar.'}
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Button
              onClick={handleCreateEvent}
              className="px-10 py-4 text-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-200 dark:shadow-pink-900/50"
            >
              <PartyPopper className="w-5 h-5" />
              {isAuthenticated ? 'Crear Nuevo Evento' : 'Comenzar Gratis'}
            </Button>
          </motion.div>

          {!isAuthenticated && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-sm text-gray-500 dark:text-gray-400"
            >
              Ya tenés cuenta?{' '}
              <Link to="/login" className="text-pink-500 hover:text-pink-600 font-medium">
                Ingresá acá
              </Link>
            </motion.p>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-pink-50 dark:bg-slate-800/50 border-t border-pink-100 dark:border-slate-700">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display text-pink-500 dark:text-pink-400">
                EventHub
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <a href="#" className="hover:text-pink-500 transition-colors">
                Cómo funciona
              </a>
              <a href="#" className="hover:text-pink-500 transition-colors">
                Ejemplos
              </a>
              <a href="#" className="hover:text-pink-500 transition-colors">
                Contacto
              </a>
            </div>

            {/* Made with */}
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span>Hecho con</span>
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
              <span>para celebraciones</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
