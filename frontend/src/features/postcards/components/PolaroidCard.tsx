import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import type { Postcard } from '../types/postcards.types';

interface PolaroidCardProps {
  postcard: Postcard;
  eventLogoUrl?: string;
  playVideo?: boolean;
  compact?: boolean;
}

export function PolaroidCard({
  postcard,
  eventLogoUrl,
  playVideo = false,
  compact = false,
}: PolaroidCardProps) {
  const [mediaError, setMediaError] = useState(false);
  const isVideo = postcard.media_type === 'video';
  const fallback = eventLogoUrl || (isVideo ? '/eventhub-video-placeholder.svg' : '/logo.png');
  const previewSrc = isVideo ? (postcard.thumbnail_path || fallback) : postcard.image_path;
  const attribution = postcard.sender_name || postcard.player_name;

  return (
    <div
      data-testid="polaroid-card"
      className={`flex w-full flex-col bg-[#fffdf8] shadow-[0_8px_22px_rgba(15,23,42,0.22)] ${
        compact ? 'p-1.5 pb-2' : 'p-3 pb-5 sm:p-4 sm:pb-6'
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
        {isVideo && playVideo ? (
          <VideoPlayer
            src={postcard.image_path}
            thumbnail={postcard.thumbnail_path}
            durationMs={postcard.media_duration_ms}
            className="h-full w-full"
          />
        ) : (
          <>
            <img
              src={mediaError ? fallback : previewSrc}
              alt={`Postal de ${attribution}`}
              className={`h-full w-full ${mediaError ? 'object-contain p-6 opacity-60' : 'object-cover'}`}
              loading="lazy"
              onError={() => setMediaError(true)}
            />
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/15" aria-hidden="true">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg text-slate-800 shadow-md">
                  ▶
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className={compact ? 'pt-1' : 'px-1 pt-3 sm:pt-4'}>
        {postcard.message.trim() && (
          <p
            className={`${compact ? 'line-clamp-1 text-[9px]' : 'text-lg leading-snug sm:text-xl'} whitespace-pre-wrap text-slate-800`}
            style={{ fontFamily: 'Caveat, cursive' }}
          >
            {postcard.message}
          </p>
        )}
        {attribution && (
          <p
            className={`${compact ? 'mt-0.5 text-[8px]' : 'mt-2 text-sm sm:text-base'} truncate text-right text-slate-600`}
            style={{ fontFamily: 'Caveat, cursive' }}
          >
            - {attribution}
          </p>
        )}
      </div>
    </div>
  );
}
