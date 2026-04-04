import { useState } from 'react';
import { motion } from 'framer-motion';
import { type Theme } from '@/shared/theme/ThemeProvider';
import { VideoPlayer } from './VideoPlayer';

export type FramedPhotoOrientation = 'portrait' | 'landscape' | 'square' | null;

export interface FramedPhotoProps {
  src: string;
  isVideo: boolean;
  orientation: FramedPhotoOrientation;
  caption: string;
  theme?: Theme;
  thumbnailPath?: string;
  durationMs?: number;
  className?: string;
  eventLogoUrl?: string;
}

function getAspectRatioClass(orientation: FramedPhotoOrientation): string {
  switch (orientation) {
    case 'portrait':
      return 'aspect-[3/4]';
    case 'landscape':
      return 'aspect-[4/3]';
    case 'square':
    default:
      return 'aspect-square';
  }
}

export function FramedPhoto({
  src,
  isVideo,
  orientation,
  caption,
  theme,
  thumbnailPath,
  durationMs,
  className = '',
  eventLogoUrl,
}: FramedPhotoProps) {
  const [imageError, setImageError] = useState(false);

  const textColor = theme?.textColor || '#1E293B';

  const aspectRatio = getAspectRatioClass(orientation);
  const fallbackSrc = eventLogoUrl || '/logo.png';

  return (
    <motion.div
      className={`flex flex-col items-center ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div
        className="relative bg-white p-2 shadow-md overflow-hidden"
        role={isVideo ? 'group' : 'img'}
        aria-label={isVideo ? `Video de ${caption}` : `Foto de ${caption}`}
      >
        <div className={`relative w-full ${aspectRatio} overflow-hidden bg-gray-100`}>
          {isVideo ? (
            <VideoPlayer
              src={src}
              thumbnail={thumbnailPath}
              durationMs={durationMs}
              className="w-full h-full"
            />
          ) : (
            <img
              src={imageError ? fallbackSrc : src}
              alt={`Foto de ${caption}`}
              className={`w-full h-full ${imageError ? 'object-contain p-4 opacity-50' : 'object-cover'}`}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <p
          className="text-sm font-medium truncate max-w-[200px]"
          style={{ color: textColor }}
          title={caption}
        >
          {caption}
        </p>
        {isVideo && (
          <p
            className="text-[10px] uppercase tracking-wider mt-0.5"
            style={{ color: `${textColor}80` }}
          >
            video
          </p>
        )}
      </div>
    </motion.div>
  );
}
