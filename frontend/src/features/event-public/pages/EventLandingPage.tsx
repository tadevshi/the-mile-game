import { motion } from 'framer-motion';
import { Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useFeatureEnabled, useEventStore } from '@/shared/store/eventStore';
import { EventLayout } from './EventLayout';
import { useTheme } from '@/shared/theme';

function EventLandingContent() {
  const { slug } = useParams<{ slug: string }>();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');
  const { currentTheme: theme } = useTheme();

  // Generate theme-based gradient background style
  const bgStyle = {
    background: `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.secondaryColor} 50%, ${theme.bgColor} 100%)`,
  };

  // Primary button style from theme
  const primaryButtonStyle = {
    background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor} 100%)`,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen" style={bgStyle}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-block mb-4">
            <Sparkles 
              className="w-12 h-12 mx-auto animate-pulse" 
              style={{ color: theme.primaryColor }} 
            />
          </div>
          <h1 
            className="text-4xl md:text-5xl font-display mb-2"
            style={{ color: theme.textColor, fontFamily: `var(--font-display)` }}
          >
            {currentEvent?.name || 'Evento'}
          </h1>
          {currentEvent?.description && (
            <p 
              className="text-lg font-serif italic max-w-md mx-auto"
              style={{ color: theme.textColor, opacity: 0.8 }}
            >
              {currentEvent.description}
            </p>
          )}
        </motion.div>

        {currentEvent?.date && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg border border-white/50 p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${theme.primaryColor}20` }}
                >
                  <Calendar className="w-5 h-5" style={{ color: theme.primaryColor }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: theme.textColor, opacity: 0.6 }}>Fecha</p>
                  <p className="font-medium" style={{ color: theme.textColor }}>
                    {formatDate(currentEvent.date)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {quizEnabled && (
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to={`/e/${slug}/quiz`}>
                <div 
                  className="rounded-2xl p-6 text-white shadow-lg cursor-pointer h-full"
                  style={primaryButtonStyle}
                >
                  <div className="text-3xl mb-3">🎯</div>
                  <h3 className="text-xl font-display mb-1" style={{ fontFamily: `var(--font-display)` }}>Jugar Quiz</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Demuestra qué tan bien conocés a la cumpleañera
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm">
                    <span>Empezar</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to={`/e/${slug}/ranking`}>
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer h-full">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="text-xl font-display mb-1" style={{ fontFamily: `var(--font-display)` }}>Ranking</h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Ver quién conoce más a la cumpleañera
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm">
                  <span>Ver tabla</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>

          {corkboardEnabled && (
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to={`/e/${slug}/corkboard`}>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer h-full">
                  <div className="text-3xl mb-3">📌</div>
                  <h3 className="text-xl font-display mb-1" style={{ fontFamily: `var(--font-display)` }}>Cartelera</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Dejá tu postal y mensaje para la cumpleañera
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm">
                    <span>Visitar</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <p className="text-sm" style={{ color: theme.textColor, opacity: 0.4 }}>
            Powered by EventHub ✨
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export function EventLandingPage() {
  return (
    <EventLayout>
      <EventLandingContent />
    </EventLayout>
  );
}
