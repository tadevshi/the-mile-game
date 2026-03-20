import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { useLandingStore } from '../store/landingStore';
import { Button } from '@/shared/components/Button';

export function EventCodeForm() {
  const navigate = useNavigate();
  const { eventCode, setEventCode, isValidatingCode, codeError, setCodeValidation, trackCTA } = useLandingStore();
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
    <section className="py-16 px-4 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-display text-gray-800 dark:text-white mb-3">
            ¿Ya tenés un código de evento?
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Ingresá el código que recibiste para unirte a la celebración
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="relative"
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MapPin className="w-5 h-5 text-pink-400 dark:text-pink-500" />
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
                bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm
                border-2 transition-all duration-200
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                disabled:opacity-60 disabled:cursor-not-allowed
                ${codeError 
                  ? 'border-red-300 dark:border-red-700 focus:border-red-400' 
                  : 'border-pink-200 dark:border-slate-600 focus:border-pink-400 dark:focus:border-pink-500'
                }
                focus:outline-none focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-800
              `}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <Button
                type="submit"
                disabled={isValidatingCode || isSuccess || !eventCode.trim()}
                className={`
                  px-6 py-2 rounded-full transition-all duration-300
                  ${isSuccess 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-pink-500 hover:bg-pink-600'
                  }
                `}
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
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {codeError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{codeError}</span>
            </motion.div>
          )}

          {/* Help text */}
          {!codeError && !isSuccess && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            ¿No tenés un código?
          </p>
          <a
            href="#create"
            className="text-pink-500 hover:text-pink-600 font-medium text-sm underline underline-offset-4"
            onClick={() => {
              document.getElementById('create-event-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Creá tu propio evento
          </a>
        </motion.div>
      </div>
    </section>
  );
}
