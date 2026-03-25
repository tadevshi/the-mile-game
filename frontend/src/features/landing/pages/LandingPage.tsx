import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useLandingStore } from '../store/landingStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EventCodeForm } from '../components/EventCodeForm';
import { DemoVideoSection } from '../components/DemoVideoSection';
import { PricingTable } from '../components/PricingTable';
import { TestimonialsCarousel } from '../components/TestimonialsCarousel';
import { LandingFooter } from '../components/LandingFooter';

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

  const handleJoinEvent = () => {
    trackCTA('join');
    const input = document.getElementById('event-code-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--background)', color: 'var(--on-background)' }}>
      {/* Fixed Glass Header */}
      <header className="stitch-glass-header w-[calc(100%-2rem)] max-w-md" style={{ zIndex: 55 }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary)' }}>
              EventHub
            </span>
          </div>
          <nav className="flex items-center gap-3 flex-nowrap">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium transition-colors whitespace-nowrap"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium transition-colors whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                  Ingresar
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                  style={{ background: 'var(--primary)', color: 'white' }}
                >
                  Registrarse
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 px-4 pb-12 relative">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <span 
            className="inline-block text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'var(--primary)' }}
          >
            The Digital Gala Experience
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl text-center leading-tight mb-6"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Creá experiencias{' '}
          <span className="italic" style={{ color: 'var(--primary)' }}>
            memorables
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-base md:text-lg max-w-lg mx-auto mb-10"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Eventos interactivos con quizzes personalizados, carteleras de fotos y cajas secretas. 
          Todo lo que necesitás para celebrar.
        </motion.p>

        {/* CTA Buttons - Stacked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center gap-3 max-w-sm mx-auto"
        >
          <button onClick={handleCreateEvent} className="stitch-btn-primary w-full">
            Crear mi Evento
          </button>
          <button onClick={handleJoinEvent} className="stitch-btn-outline w-full">
            Ingresar a Evento
          </button>
        </motion.div>

        {/* Decorative Images */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 relative max-w-md mx-auto"
        >
          <div className="relative h-64 md:h-80">
            {/* Main Image */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-48 md:w-64 h-56 md:h-72 rounded-3xl overflow-hidden shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, var(--surface-container-high) 0%, var(--surface-container) 100%)',
                transform: 'translateX(-50%) rotate(-2deg)'
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl md:text-8xl">🎉</span>
              </div>
            </div>
            
            {/* Secondary Image - Left */}
            <div 
              className="absolute bottom-0 left-0 w-28 md:w-36 h-36 md:h-44 rounded-2xl overflow-hidden shadow-lg"
              style={{ 
                background: 'var(--surface-container)',
                transform: 'rotate(6deg)'
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl md:text-5xl">🎂</span>
              </div>
            </div>
            
            {/* Secondary Image - Right */}
            <div 
              className="absolute bottom-0 right-0 w-28 md:w-36 h-36 md:h-44 rounded-2xl overflow-hidden shadow-lg"
              style={{ 
                background: 'var(--surface-container)',
                transform: 'rotate(-4deg)'
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl md:text-5xl">🎁</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
              Todo lo que necesitás
            </h2>
            <p style={{ color: 'var(--on-surface-variant)' }}>
              Herramientas interactivas para hacer tu celebración única
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Quiz Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="stitch-bento-card md:row-span-2"
              style={{ background: 'var(--surface-container)' }}
            >
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Quiz Interactivo
              </h3>
              <p style={{ color: 'var(--on-surface-variant)' }}>
                Preguntas personalizadas para conocer al festejado. Ranking en tiempo real 
                con medals 3D y animaciones.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span 
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: 'var(--surface-container-high)' }}
                >
                  Multiple choice
                </span>
                <span 
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: 'var(--surface-container-high)' }}
                >
                  This or That
                </span>
                <span 
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: 'var(--surface-container-high)' }}
                >
                  Texto libre
                </span>
              </div>
            </motion.div>

            {/* Corkboard Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="stitch-bento-card"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <div className="text-4xl mb-4">📌</div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Cartelera de Fotos
              </h3>
              <p style={{ color: 'var(--on-surface-variant)' }}>
                Invitados comparten fotos y mensajes en un corcho digital colaborativo.
              </p>
            </motion.div>

            {/* Secret Box Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="stitch-bento-card"
              style={{ background: 'var(--surface-container-high)' }}
            >
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Caja Secreta
              </h3>
              <p style={{ color: 'var(--on-surface-variant)' }}>
                Sorpresas de invitados remotos que se revelan en el momento perfecto.
              </p>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="stitch-bento-card md:col-span-2"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)', color: 'white' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)', color: 'white' }}>
                    +500 eventos creados
                  </h3>
                  <p className="text-sm opacity-90">
                    Únete a cientos de celebraciones memorables
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">4.9</div>
                    <div className="text-xs opacity-80">★ Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">50+</div>
                    <div className="text-xs opacity-80">Invitados</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <DemoVideoSection />

      {/* Testimonials Carousel */}
      <TestimonialsCarousel />

      {/* Pricing Table */}
      <PricingTable />

      {/* Event Code Entry */}
      <EventCodeForm />

      {/* Footer */}
      <LandingFooter />

      {/* Floating Action Button */}
      <button 
        onClick={handleCreateEvent}
        className="stitch-fab"
        aria-label="Crear evento"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      {/* Fixed Bottom Navigation */}
      <nav className="stitch-bottom-nav">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 py-2 px-4">
            <span className="material-symbols-outlined text-xl" style={{ color: 'var(--primary)' }}>
              home
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              Inicio
            </span>
          </button>
          
          <button 
            onClick={handleCreateEvent}
            className="flex flex-col items-center gap-1 py-2 px-4"
          >
            <span className="material-symbols-outlined text-xl" style={{ color: 'var(--on-surface-variant)' }}>
              add_circle
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
              Crear
            </span>
          </button>
          
          <button className="flex flex-col items-center gap-1 py-2 px-4">
            <span className="material-symbols-outlined text-xl" style={{ color: 'var(--on-surface-variant)' }}>
              explore
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
              Explorar
            </span>
          </button>
          
          {isAuthenticated ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: 'var(--on-surface-variant)' }}>
                person
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                Perfil
              </span>
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: 'var(--on-surface-variant)' }}>
                person
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                Perfil
              </span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
