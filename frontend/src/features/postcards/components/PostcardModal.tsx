import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { PushPin } from './PushPin';
import { VideoPlayer } from './VideoPlayer';
import type { Postcard } from '../types/postcards.types';

interface PostcardModalProps {
  postcard: Postcard | null;
  onClose: () => void;
  eventLogoUrl?: string;
}

export function PostcardModal({ postcard, onClose, eventLogoUrl }: PostcardModalProps) {
  const postcardRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  const isVideo = postcard?.media_type === 'video';

  const handleDownload = async () => {
    // Videos can't be downloaded as PNG easily, so skip download for videos
    if (isVideo || !postcardRef.current || !postcard) return;

    try {
      const dataUrl = await toPng(postcardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `postal-${postcard.player_name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading postcard:', err);
    }
  };

  return (
    <AnimatePresence>
      {postcard && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Contenido */}
          <motion.div
            className="relative z-10 w-full max-w-md md:max-w-2xl"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Pin centrado — z-30 siempre encima de la postal */}
            {!isVideo && (
              <div className="flex justify-center mb-[-8px] relative z-30 pointer-events-none">
                <PushPin className="scale-125" />
              </div>
            )}

            {/* Postal expandida — esquinas rectas como postal real */}
            <div
              ref={postcardRef}
              className="bg-white shadow-2xl overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Mobile: vertical (media arriba, mensaje abajo) */}
              {/* Desktop: horizontal (media izquierda, mensaje derecha) */}
              <div className="flex flex-col md:flex-row">
                {/* Media (imagen o video) */}
                <div className="md:w-1/2 overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--color-secondary-light)' }}>
                  {isVideo ? (
                    <VideoPlayer
                      src={postcard.image_path} // video_path para videos
                      thumbnail={postcard.thumbnail_path}
                      durationMs={postcard.media_duration_ms}
                      className="w-full aspect-video md:aspect-square"
                    />
                  ) : (
                    <img
                      src={imageError ? (eventLogoUrl || '/logo.png') : postcard.image_path}
                      alt={`Postal de ${postcard.player_name}`}
                      className={`w-full h-auto max-h-[60vh] ${imageError ? 'object-contain p-8 opacity-50' : 'object-contain'}`}
                      onError={() => setImageError(true)}
                    />
                  )}
                </div>

                {/* Separador */}
                <div className="h-px md:h-auto md:w-px" style={{ backgroundColor: 'var(--color-border-light)' }} />

                {/* Mensaje */}
                <div className="md:w-1/2 p-6 flex flex-col justify-between relative min-h-[200px]">
                  {/* Líneas decorativas */}
                  <div className="absolute inset-x-5 top-12 space-y-5 pointer-events-none">
                    <div className="h-px" style={{ backgroundColor: 'var(--color-border-light)' }} />
                    <div className="h-px" style={{ backgroundColor: 'var(--color-border-light)' }} />
                    <div className="h-px" style={{ backgroundColor: 'var(--color-border-light)' }} />
                    <div className="h-px" style={{ backgroundColor: 'var(--color-border-light)' }} />
                  </div>

                  <div className="relative z-10">
                    <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--color-on-surface-muted)' }}>
                      mensaje:
                    </p>
                    <p className="text-sm md:text-base leading-relaxed font-serif italic whitespace-pre-wrap" style={{ color: 'var(--color-on-surface)' }}>
                      {postcard.message || '...'}
                    </p>
                  </div>

                  {/* From */}
                  <div className="relative z-10 mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                    <p className="text-sm flex items-center gap-2" style={{ color: 'var(--color-on-surface-muted)' }}>
                      <span className="text-xl">{postcard.player_avatar}</span>
                      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {postcard.player_name}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones debajo de la postal */}
            <div className="flex justify-center gap-3 mt-4">
              {!isVideo && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownload}
                  className="px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium shadow-lg border flex items-center gap-2 cursor-pointer"
                  style={{ color: 'var(--color-on-surface)', borderColor: 'var(--color-border-light)' }}
                >
                  <span>📥</span> Descargar
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium shadow-lg border cursor-pointer"
                style={{ color: 'var(--color-on-surface)', borderColor: 'var(--color-border-light)' }}
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
