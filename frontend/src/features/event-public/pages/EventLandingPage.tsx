import { motion } from 'framer-motion';
import { Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useFeatureEnabled } from '@/shared/store/eventStore';
import { EventLayout } from './EventLayout';
import { useEventStore } from '@/shared/store/eventStore';

function EventLandingContent() {
  const { slug } = useParams<{ slug: string }>();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-block mb-4">
            <Sparkles className="w-12 h-12 text-pink-500 mx-auto animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display text-gray-800 mb-2">
            {currentEvent?.name || 'Evento'}
          </h1>
          {currentEvent?.description && (
            <p className="text-lg text-gray-600 font-serif italic max-w-md mx-auto">
              {currentEvent.description}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg border border-white/50 p-6"
        >
          <div className="space-y-4">
            {currentEvent?.date && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium text-gray-800">
                    {formatDate(currentEvent.date)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

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
                <div className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer h-full">
                  <div className="text-3xl mb-3">🎯</div>
                  <h3 className="text-xl font-display mb-1">Jugar Quiz</h3>
                  <p className="text-sm text-white/80">
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
                <h3 className="text-xl font-display mb-1">Ranking</h3>
                <p className="text-sm text-white/80">
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
                  <h3 className="text-xl font-display mb-1">Cartelera</h3>
                  <p className="text-sm text-white/80">
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
          <p className="text-sm text-gray-400">
            Powered by The Mile Game ✨
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
