import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface VideoPlayerProps {
  src: string;
  thumbnail?: string;
  durationMs?: number;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ 
  src, 
  thumbnail, 
  durationMs,
  poster,
  className = '' 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(false);
  };

  // Use thumbnail as poster if no poster provided
  const posterSrc = poster || thumbnail;

  return (
    <div 
      className={`relative overflow-hidden bg-black rounded ${className}`}
      onClick={() => !isPlaying && handlePlay()}
      onMouseEnter={() => isPlaying && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={posterSrc}
        className="w-full h-full object-cover"
        onClick={(e) => {
          e.stopPropagation();
          if (isPlaying) {
            handlePause();
          } else {
            handlePlay();
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        playsInline
        controls={showControls}
      />

      {/* Play button overlay (when not playing) */}
      {!isPlaying && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Play button circle */}
          <motion.div
            className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-8 h-8 text-pink-500 ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </motion.div>

          {/* Duration badge */}
          {durationMs && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(durationMs)}
            </div>
          )}

          {/* Video indicator */}
          <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            VIDEO
          </div>
        </motion.div>
      )}

      {/* Controls overlay (when playing) */}
      {isPlaying && showControls && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center gap-2 text-white text-sm">
            {/* Play/Pause button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePause();
              }}
              className="hover:text-pink-400 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Duration */}
            {durationMs && (
              <span className="ml-auto">{formatDuration(durationMs)}</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
