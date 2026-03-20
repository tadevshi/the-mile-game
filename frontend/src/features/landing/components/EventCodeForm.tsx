import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { useLandingStore } from '../store/landingStore';
import { useAuthStore } from '@/features/auth/store/authStore';

export function EventCodeForm() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { eventCode, setEventCode, isValidatingCode, codeError, setCodeValidation, trackCTA } = useLandingStore();

  const handleCreateEvent = () => {
    trackCTA('create');
    if (isAuthenticated) {
      navigate('/events/new');
    } else {
      navigate('/register');
    }
  };
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = eventCode.trim().toLowerCase();
    if (!code) {
      setCodeValidation(false, 'Ingresá un código de evento');
      return;
    }

    setCodeValidation(true, null);
    setHasSubmitted(true);

    try {
      // Try to fetch event by slug - we just need to verify it exists
      await api.getEventBySlug(code);
      
      // Success - navigate to event
      setCodeValidation(false, null);
      trackCTA('join');
      
      // Small delay for feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate(`/e/${code}`);
    } catch (error: any) {
      // Event not found
      const isNotFound = error?.response?.status === 404 || 
                        error?.message?.includes('404') ||
                        error?.message?.includes('not found') ||
                        error?.message?.includes('No existe');
      
      if (isNotFound) {
        setCodeValidation(false, 'Evento no encontrado. Verificá el código e intentá de nuevo.');
      } else {
        setCodeValidation(false, 'Error de conexión. Intentá de nuevo.');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventCode(e.target.value);
    if (codeError) setCodeValidation(false, null);
  };

  const isSuccess = hasSubmitted && !isValidatingCode && !codeError;

  return (
    <section className="py-16 px-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-8"
        >
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-block px-4 py-1 text-sm font-medium rounded-full mb-4"
            style={{ background: 'var(--surface-container)', color: 'var(--primary)' }}
          >
            Únete a la celebración
          </motion.span>
          <h2 
            className="text-2xl md:text-3xl mb-3"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--on-background)' }}
          >
            ¿Ya tenés un código de evento?
          </h2>
          <p style={{ color: 'var(--on-surface-variant)' }}>
            Ingresá el código que recibiste para unirte a la celebración
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          onSubmit={handleSubmit}
          className="relative"
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-xl" style={{ color: 'var(--on-surface-variant)' }}>
                link
              </span>
            </div>
            <input
              id="event-code-input"
              type="text"
              value={eventCode}
              onChange={handleChange}
              placeholder="Ej: cumple-ana-2026"
              disabled={isValidatingCode || isSuccess}
              className={`
                w-full pl-12 pr-32 py-4 text-lg rounded-full
                backdrop-blur-sm border-2 transition-all duration-200
                placeholder:text-gray-400
                disabled:opacity-60 disabled:cursor-not-allowed
                ${codeError 
                  ? 'border-red-400 focus:border-red-500' 
                  : 'border-[var(--surface-container-high)] focus:border-[var(--primary)]'
                }
                focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              `}
              style={{ 
                background: 'var(--surface-container-low)',
                color: 'var(--on-background)'
              }}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <button
                type="submit"
                disabled={isValidatingCode || isSuccess || !eventCode.trim()}
                className={`
                  px-6 py-2 rounded-full transition-all duration-300 font-medium
                  ${isSuccess 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'hover:opacity-90'
                  }
                `}
                style={{ 
                  background: isSuccess ? undefined : 'var(--primary)',
                  color: 'white'
                }}
              >
                {isValidatingCode ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Buscando...
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ¡Encontrado!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Buscar
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {codeError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-sm"
              style={{ color: '#ef4444' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{codeError}</span>
            </motion.div>
          )}

          {/* Help text */}
          {!codeError && !isSuccess && (
            <p className="mt-3 text-xs text-center" style={{ color: 'var(--on-surface-variant)' }}>
              El código es la última parte de la URL del evento
            </p>
          )}
        </motion.form>

        {/* Example */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm mb-2" style={{ color: 'var(--on-surface-variant)' }}>
            ¿No tenés un código?
          </p>
          <button
            onClick={handleCreateEvent}
            className="font-medium text-sm underline underline-offset-4 transition-colors"
            style={{ color: 'var(--primary)' }}
          >
            Creá tu propio evento
          </button>
        </motion.div>
      </div>
    </section>
  );
}
