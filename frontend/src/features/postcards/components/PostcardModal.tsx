import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { PushPin } from './PushPin';
import { VideoPlayer } from './VideoPlayer';
import type { Postcard } from '../types/postcards.types';
import type { Theme } from '@/shared/theme/ThemeProvider';

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'postcard';
}

function getFileExtensionFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() || fallback;
  } catch {
    return fallback;
  }
}

async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(objectUrl);
}

interface PostcardModalProps {
  postcard: Postcard | null;
  onClose: () => void;
  eventLogoUrl?: string;
  theme?: Theme;
}

export function PostcardModal({ postcard, onClose, eventLogoUrl, theme }: PostcardModalProps) {
  const postcardRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  const isVideo = postcard?.media_type === 'video';
  const bgColor = theme?.bgColor || '#FFFFFF';
  const textColor = theme?.textColor || '#1E293B';
  const primaryColor = theme?.primaryColor || '#EC4899';
  const secondaryColor = theme?.secondaryColor || '#FBCFE8';
  const headingFont = theme?.headingFont || 'Playfair Display';
  const bodyFont = theme?.bodyFont || 'Montserrat';

  const handleDownload = async () => {
    if (!postcard) return;

    if (isVideo) {
      try {
        const extension = getFileExtensionFromUrl(postcard.image_path, 'mp4');
        await downloadFile(
          postcard.image_path,
          `postal-video-${sanitizeFilename(postcard.player_name)}.${extension}`
        );
      } catch (err) {
        console.error('Error downloading video postcard:', err);
      }
      return;
    }

    if (!postcardRef.current) return;

    try {
      const dataUrl = await toPng(postcardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `postal-${sanitizeFilename(postcard.player_name)}.png`;
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
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8"
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
            className="relative z-10 w-full max-w-md md:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
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
              className="shadow-2xl overflow-hidden"
              style={{
                backgroundColor: bgColor,
                borderColor: `${primaryColor}20`,
                borderWidth: '1px',
                fontFamily: bodyFont,
              }}
            >
              {/* Mobile: vertical (media arriba, mensaje abajo) */}
              {/* Desktop: horizontal (media izquierda, mensaje derecha) */}
              <div className="flex flex-col md:flex-row">
                {/* Media (imagen o video) */}
                <div className="md:w-1/2 overflow-hidden flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
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
                <div className="h-px md:h-auto md:w-px" style={{ backgroundColor: `${primaryColor}30` }} />

                {/* Mensaje */}
                <div className="md:w-1/2 p-6 flex flex-col justify-between relative min-h-[200px]">
                  {/* Líneas decorativas */}
                  <div className="absolute inset-x-5 top-12 space-y-5 pointer-events-none">
                    <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
                    <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
                    <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
                    <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
                  </div>

                  <div className="relative z-10">
                    <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: `${textColor}80` }}>
                      mensaje:
                    </p>
                    <p
                      className="text-sm md:text-base leading-relaxed italic whitespace-pre-wrap"
                      style={{
                        color: textColor,
                        fontFamily: headingFont.includes('Vibes') || headingFont.includes('Script') ? headingFont : `${headingFont}, serif`,
                      }}
                    >
                      {postcard.message || '...'}
                    </p>
                  </div>

                  {/* From */}
                  <div className="relative z-10 mt-4 pt-3 border-t" style={{ borderColor: `${primaryColor}30` }}>
                    <p className="text-sm flex items-center gap-2" style={{ color: `${textColor}80` }}>
                      <span className="text-xl">{postcard.player_avatar}</span>
                      <span className="font-semibold" style={{ color: primaryColor }}>
                        {postcard.player_name}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones debajo de la postal */}
            <div className="flex justify-center gap-3 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium shadow-lg border flex items-center justify-center gap-2 cursor-pointer"
                style={{ color: textColor, borderColor: `${primaryColor}30` }}
              >
                <span>📥</span> {isVideo ? 'Descargar video' : 'Descargar'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium shadow-lg border flex items-center justify-center cursor-pointer"
                style={{ color: textColor, borderColor: `${primaryColor}30` }}
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
