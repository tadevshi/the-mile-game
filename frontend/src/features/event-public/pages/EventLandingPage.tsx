import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Target, Trophy, Gift, Camera } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useFeatureEnabled, useEventStore } from '@/shared/store/eventStore';
import { EventLayout } from './EventLayout';
import { useTheme } from '@/shared/theme';
import { usePostcards } from '@/features/postcards/hooks/usePostcards';

const VIDEO_PLACEHOLDER = '/eventhub-video-placeholder.svg';

function EventLandingContent() {
  const { slug } = useParams<{ slug: string }>();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');
  const { currentTheme: theme } = useTheme();
  
  // Fetch postcards for preview
  const { postcards } = usePostcards(slug);
  const recentPostcards = postcards.slice(0, 3);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<string[]>([]);

  // Logo with fallback to Gift icon
  const logoUrl = currentEvent?.settings?.logo_url;

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
    <div 
      className="min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] md:min-h-screen"
      style={{ 
        background: theme.bgColor 
          ? theme.bgColor 
          : 'linear-gradient(to bottom, #fdf9f3, #faf6f0, #f5f1eb)'
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header con Logo y Titulo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={currentEvent?.name || 'Evento'} 
                className="w-12 h-12 object-contain rounded-xl shadow-md"
              />
            ) : (
              <div 
                className="w-12 h-12 flex items-center justify-center rounded-xl shadow-md"
                style={{ backgroundColor: `${theme.primaryColor}15` }}
              >
                <Gift className="w-6 h-6" style={{ color: theme.primaryColor }} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 
              className="text-lg font-bold tracking-tight"
              style={{ color: theme.primaryColor, fontFamily: `var(--font-display)` }}
            >
              {currentEvent?.name || 'Evento'}
            </h1>
            {currentEvent?.date && (
              <p className="text-xs" style={{ color: theme.textColor }}>
                {formatDate(currentEvent.date)}
              </p>
            )}
          </div>
        </motion.div>

        {/* Subtitulo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 
            className="text-2xl font-bold mb-1"
            style={{ color: theme.primaryColor, fontFamily: `var(--font-display)` }}
          >
            Bienvenidos
          </h2>
          <p className="text-sm" style={{ color: theme.textColor }}>
            Explora las actividades que hemos preparado para celebrar juntos.
          </p>
        </motion.div>

        {/* Grid de Actividades - Estilo Bento */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Quiz Card - Con imagen de fondo */}
          {quizEnabled && (
            <Link to={`/e/${slug}/quiz`} className="group">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden rounded-2xl h-40 cursor-pointer shadow-md"
              >
                {/* Fondo sutil con color primario */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundColor: theme.primaryColor
                  }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                
                {/* Contenido */}
                <div className="relative z-10 p-4 flex flex-col justify-end h-full text-white">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                  >
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base leading-tight" style={{ fontFamily: `var(--font-display)` }}>
                    Quiz
                  </h3>
                  <p className="text-[10px] opacity-90 mt-0.5 line-clamp-1">
                    Quien conoce mas?
                  </p>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Ranking Card - solo si quiz está habilitado */}
          {quizEnabled && (
            <Link to={`/e/${slug}/ranking`} className="group">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl p-4 h-40 cursor-pointer border transition-all active:scale-[0.98] flex flex-col justify-between"
                style={{ 
                  backgroundColor: `${theme.secondaryColor}33`, // 20% opacity
                  borderColor: `${theme.secondaryColor}40`
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${theme.accentColor}20` }}
                >
                  <Trophy 
                    className="w-5 h-5" 
                    style={{ color: theme.accentColor }} 
                  />
                </div>
                <div>
                  <h3 
                    className="font-bold text-base leading-tight"
                    style={{ color: theme.primaryColor, fontFamily: `var(--font-display)` }}
                  >
                    Ranking
                  </h3>
                  <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: theme.textColor }}>
                    Ver la tabla de posiciones
                  </p>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Cartelera Card - Full width con imagen de fondo */}
          {corkboardEnabled && (
            <Link to={`/e/${slug}/corkboard`} className="group col-span-2">
              <motion.div
                whileHover={{ scale: 1.01 }}  
                whileTap={{ scale: 0.99 }}
                className="relative overflow-hidden rounded-2xl h-36 cursor-pointer shadow-md"
              >
                {/* Background with accent color */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundColor: theme.accentColor
                  }}
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                
                {/* Preview de postales */}
                {recentPostcards.length > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex -space-x-2">
                    {recentPostcards.map((postcard, idx) => (
                      <div 
                        key={postcard.id}
                        className="w-12 h-12 rounded-lg border-2 border-white shadow-md overflow-hidden"
                        style={{ 
                          transform: `rotate(${(idx - 1) * 5}deg)`,
                          zIndex: recentPostcards.length - idx 
                        }}
                      >
                        {postcard.media_type === 'video' ? (
                          <img 
                            src={brokenPreviewIds.includes(postcard.id) ? VIDEO_PLACEHOLDER : (postcard.thumbnail_path || VIDEO_PLACEHOLDER)} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={() => setBrokenPreviewIds((prev) => prev.includes(postcard.id) ? prev : [...prev, postcard.id])}
                          />
                        ) : (
                          <img 
                            src={postcard.image_path} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Contenido */}
                <div className="relative z-10 p-5 flex items-center h-full">
                  <div className="flex-1">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-widest block mb-1 text-white/90"
                    >
                      En Vivo
                    </span>
                    <h3 
                      className="font-bold text-xl mb-1 text-white"
                      style={{ fontFamily: `var(--font-display)` }}
                    >
                      Cartelera
                    </h3>
                    <p className="text-[10px] max-w-[180px] text-white/80">
                      Comparte tus fotos y mensajes
                    </p>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            </Link>
          )}
        </motion.div>

        {/* Fecha del evento */}
        {currentEvent?.date && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: `${theme.secondaryColor}33` }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${theme.primaryColor}15` }}
            >
              <Calendar className="w-5 h-5" style={{ color: theme.primaryColor }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.textColor }}>Fecha del evento</p>
              <p className="font-medium text-sm" style={{ color: theme.primaryColor }}>
                {formatDate(currentEvent.date)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center pt-4"
        >
          <p className="text-xs text-gray-400">
            Powered by EventHub
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
