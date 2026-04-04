import { useRef, useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { type Theme } from '@/shared/theme/ThemeProvider';
import { FramedPhoto } from './FramedPhoto';
import { PushPin } from './PushPin';
import { getPostcardPresentation } from '../lib/postcardPresentation';
import { useMediaOrientation } from '../hooks/useMediaOrientation';
import type { Postcard } from '../types/postcards.types';

interface PostcardCardProps {
  postcard: Postcard;
  onSelect: (postcard: Postcard) => void;
  eventLogoUrl?: string;  // Logo del evento para fallback en videos
  theme?: Theme;          // Tema del evento para colores dinámicos
}

export function PostcardCard({ postcard, onSelect, eventLogoUrl, theme }: PostcardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  const isVideo = postcard.media_type === 'video';
  const presentation = getPostcardPresentation(postcard);

  // Orientation hook for photo mode
  const mediaSrc = isVideo ? (postcard.thumbnail_path || postcard.image_path) : postcard.image_path;
  const { orientation } = useMediaOrientation(mediaSrc);

  // Fallback para thumbnails: thumbnail_path -> eventLogoUrl -> placeholder por defecto
  const videoFallback = eventLogoUrl || '/eventhub-video-placeholder.svg';
  const imageFallback = eventLogoUrl || '/logo.png';

  // Colores del tema con fallbacks
  const bgColor = theme?.bgColor || '#FFFFFF';
  const textColor = theme?.textColor || '#1E293B';
  const primaryColor = theme?.primaryColor || '#EC4899';
  const secondaryColor = theme?.secondaryColor || '#FBCFE8';

  // Tipografía del tema
  const headingFont = theme?.headingFont || 'Playfair Display';
  const bodyFont = theme?.bodyFont || 'Montserrat';

  const handleSelect = () => onSelect(postcard);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  };

  // --- Photo mode: framed photo layout ---
  if (presentation.mode === 'photo') {
    return (
      <div className="relative pt-4">
        {/* Push pin centrado arriba */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <PushPin />
        </div>

        <motion.div
          ref={cardRef}
          className="postcard-card relative shadow-lg cursor-pointer overflow-hidden"
          style={{
            rotate: postcard.rotation,
            backgroundColor: bgColor,
            borderColor: `${primaryColor}20`,
            borderWidth: '1px',
            fontFamily: bodyFont,
          }}
          whileHover={{ scale: 1.05, zIndex: 30, rotate: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Abrir postal de ${presentation.captionName}`}
          layout
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="p-3 flex flex-col items-center">
            <FramedPhoto
              src={postcard.image_path}
              isVideo={isVideo}
              orientation={orientation}
              caption={presentation.captionName}
              theme={theme}
              thumbnailPath={postcard.thumbnail_path}
              durationMs={postcard.media_duration_ms}
              eventLogoUrl={eventLogoUrl}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Postcard mode: existing split layout (unchanged) ---
  return (
    <div className="relative pt-4">
      {/* Push pin centrado arriba — z-40 para estar SIEMPRE encima de la postal (hover usa z-30) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <PushPin />
      </div>

      {/* Postal con rotación */}
      <motion.div
        ref={cardRef}
        className="postcard-card relative shadow-lg cursor-pointer overflow-hidden"
        style={{
          rotate: postcard.rotation,
          backgroundColor: bgColor,
          borderColor: `${primaryColor}20`,
          borderWidth: '1px',
          fontFamily: bodyFont,
        }}
        whileHover={{ scale: 1.05, zIndex: 30, rotate: 0 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Abrir postal de ${postcard.player_name}`}
        layout
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Layout postal: foto izquierda, mensaje derecha */}
        {/* Usamos aspect ratio fijo para que siempre mantenga proporción de postal */}
        <div className="flex w-full aspect-[2/1] max-h-[220px]">
          {/* Media (imagen o video thumbnail) — lado izquierdo */}
          <div
            className="w-1/2 relative overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: secondaryColor }}
          >
            {isVideo ? (
              <>
                {/* Video thumbnail con play overlay */}
                <img
                  src={imageError ? videoFallback : (postcard.thumbnail_path || videoFallback)}
                  alt={`Video de ${postcard.player_name}`}
                  className={`absolute inset-0 w-full h-full ${imageError ? 'object-contain p-4 opacity-50' : 'object-cover'}`}
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: `${primaryColor}E6` }}
                  >
                    <svg
                      className="w-5 h-5 text-white ml-0.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Duration badge */}
                {postcard.media_duration_ms && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {Math.floor(postcard.media_duration_ms / 1000)}s
                  </div>
                )}
                {/* Video indicator */}
                <div
                  className="absolute top-1 left-1 text-white text-[8px] px-1 py-0.5 rounded flex items-center gap-0.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                </div>
              </>
            ) : (
              <img
                src={imageError ? imageFallback : postcard.image_path}
                alt={`Postal de ${postcard.player_name}`}
                className={`absolute inset-0 w-full h-full ${imageError ? 'object-contain p-4 opacity-50' : 'object-cover'}`}
                loading="lazy"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Separador vertical */}
          <div className="w-px self-stretch" style={{ backgroundColor: `${primaryColor}30` }} />

          {/* Mensaje — lado derecho */}
          <div className="w-1/2 p-3 flex flex-col justify-between relative">
            {/* Líneas decorativas de fondo (efecto postal real) */}
            <div className="absolute inset-x-3 top-8 space-y-4 pointer-events-none">
              <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
              <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
              <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
              <div className="h-px" style={{ backgroundColor: `${primaryColor}15` }} />
            </div>

            <div className="relative z-10">
              <p
                className="text-[10px] uppercase tracking-wider font-medium mb-1"
                style={{ color: `${textColor}80` }}
              >
                mensaje:
              </p>
              <p
                className="text-xs leading-relaxed line-clamp-4 italic whitespace-pre-wrap"
                style={{
                  color: textColor,
                  fontFamily: headingFont.includes('Vibes') || headingFont.includes('Script') ? headingFont : `${headingFont}, serif`,
                }}
              >
                {postcard.message || '...'}
              </p>
            </div>

            {/* From: nombre */}
            <div className="relative z-10 mt-2 pt-2" style={{ borderTopColor: `${primaryColor}30`, borderTopWidth: '1px' }}>
              <p className="text-[10px] flex items-center gap-1" style={{ color: `${textColor}80` }}>
                <span className="text-sm">{postcard.player_avatar}</span>
                <span className="font-medium" style={{ color: primaryColor }}>
                  {postcard.player_name}
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Utilidad para descargar una postal como PNG
export async function downloadPostcardAsPng(
  element: HTMLElement,
  playerName: string
) {
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = `postal-${playerName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Error downloading postcard:', err);
  }
}
