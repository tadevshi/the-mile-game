import { useState, useEffect } from 'react';

export type MediaOrientation = 'portrait' | 'landscape' | 'square';

export interface UseMediaOrientationResult {
  /** Detected orientation. Returns the fallback while metadata is loading, or null when no media URL is provided. */
  orientation: MediaOrientation | null;
  /** True while waiting for image/video metadata to load. */
  isLoading: boolean;
  /** Error message if metadata loading failed. */
  error: string | null;
}

export interface UseMediaOrientationOptions {
  /** Stable fallback orientation returned before metadata resolves. Default: 'landscape'. */
  fallback?: MediaOrientation;
  /** Threshold ratio to consider square. Default: 0.05 (5% difference). */
  squareThreshold?: number;
}

/**
 * Detects portrait vs landscape orientation for an image or video URL.
 *
 * Provides a stable fallback orientation immediately to minimize layout flicker,
 * then resolves to the actual orientation once media metadata loads.
 *
 * Reusable for both card thumbnails and modal previews.
 *
 * @param mediaUrl - URL of the image or video to measure
 * @param options - Configuration for fallback and square threshold
 *
 * @example
 * ```tsx
 * const { orientation, isLoading } = useMediaOrientation(postcard.image_path, {
 *   fallback: 'landscape',
 * });
 *
 * // Use in className: orientation === 'portrait' ? 'h-80' : 'h-48'
 * ```
 */
export function useMediaOrientation(
  mediaUrl: string | undefined,
  options: UseMediaOrientationOptions = {}
): UseMediaOrientationResult {
  const { fallback = 'landscape', squareThreshold = 0.05 } = options;

  const [resolvedOrientation, setResolvedOrientation] = useState<MediaOrientation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaUrl) {
      setResolvedOrientation(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;

    setResolvedOrientation(null);
    setIsLoading(true);
    setError(null);

    const isVideoUrl = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(mediaUrl);

    if (isVideoUrl) {
      detectVideoOrientation(mediaUrl, squareThreshold)
        .then((result) => {
          if (!isCancelled) {
            setResolvedOrientation(result);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : 'Failed to detect video orientation');
            setIsLoading(false);
          }
        });
    } else {
      detectImageOrientation(mediaUrl, squareThreshold)
        .then((result) => {
          if (!isCancelled) {
            setResolvedOrientation(result);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : 'Failed to detect image orientation');
            setIsLoading(false);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [mediaUrl, squareThreshold]);

  // Return fallback while loading, resolved value when done
  return {
    orientation: isLoading ? fallback : resolvedOrientation,
    isLoading,
    error,
  };
}

/**
 * Determines orientation from width/height dimensions.
 * Uses a threshold to avoid misclassifying near-square media.
 *
 * @internal Exported for testing purposes.
 */
export function classifyOrientation(
  width: number,
  height: number,
  squareThreshold: number
): MediaOrientation {
  if (width === 0 || height === 0) return 'landscape';

  const ratio = Math.abs(width - height) / Math.max(width, height);

  if (ratio <= squareThreshold) return 'square';
  return height > width ? 'portrait' : 'landscape';
}

/**
 * Loads an image and resolves with its orientation.
 */
function detectImageOrientation(
  url: string,
  squareThreshold: number
): Promise<MediaOrientation> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(classifyOrientation(img.naturalWidth, img.naturalHeight, squareThreshold));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Loads a video element, waits for metadata, and resolves with its orientation.
 */
function detectVideoOrientation(
  url: string,
  squareThreshold: number
): Promise<MediaOrientation> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      // Clean up the video element to free memory
      video.src = '';
      video.load();
      resolve(classifyOrientation(video.videoWidth, video.videoHeight, squareThreshold));
    };
    video.onerror = () => {
      video.src = '';
      reject(new Error('Failed to load video metadata'));
    };
    video.src = url;
  });
}
