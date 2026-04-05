import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaOrientation, classifyOrientation } from './useMediaOrientation';

describe('useMediaOrientation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('classifyOrientation (pure function)', () => {
    it('returns portrait when height > width', () => {
      expect(classifyOrientation(600, 900, 0.05)).toBe('portrait');
      expect(classifyOrientation(100, 200, 0.05)).toBe('portrait');
    });

    it('returns landscape when width > height', () => {
      expect(classifyOrientation(900, 600, 0.05)).toBe('landscape');
      expect(classifyOrientation(200, 100, 0.05)).toBe('landscape');
    });

    it('returns square when dimensions are equal', () => {
      expect(classifyOrientation(800, 800, 0.05)).toBe('square');
    });

    it('returns square when difference is within threshold', () => {
      // 800x820 = 2.4% difference, within 5% threshold
      expect(classifyOrientation(800, 820, 0.05)).toBe('square');
      expect(classifyOrientation(820, 800, 0.05)).toBe('square');
    });

    it('returns portrait/landscape when difference exceeds threshold', () => {
      // 800x820 = 2.4% difference, outside 1% threshold
      expect(classifyOrientation(800, 820, 0.01)).toBe('portrait');
      expect(classifyOrientation(820, 800, 0.01)).toBe('landscape');
    });

    it('returns landscape for zero dimensions', () => {
      expect(classifyOrientation(0, 0, 0.05)).toBe('landscape');
      expect(classifyOrientation(0, 100, 0.05)).toBe('landscape');
      expect(classifyOrientation(100, 0, 0.05)).toBe('landscape');
    });
  });

  describe('hook behavior', () => {
    it('returns null orientation for undefined URL', () => {
      const { result } = renderHook(() => useMediaOrientation(undefined));

      expect(result.current.orientation).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns null orientation for empty string URL', () => {
      const { result } = renderHook(() => useMediaOrientation(''));

      expect(result.current.orientation).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('uses custom fallback orientation', () => {
      // We can't easily mock Image in jsdom, so we test the fallback behavior
      // by verifying the initial state uses the custom fallback
      const { result } = renderHook(() =>
        useMediaOrientation('/test.jpg', { fallback: 'portrait' })
      );

      // Should use custom fallback immediately
      expect(result.current.orientation).toBe('portrait');
      expect(result.current.isLoading).toBe(true);
    });

    it('uses landscape as default fallback', () => {
      const { result } = renderHook(() => useMediaOrientation('/test.jpg'));

      expect(result.current.orientation).toBe('landscape');
      expect(result.current.isLoading).toBe(true);
    });

    it('detects video URLs and sets loading state', async () => {
      const originalCreateElement = document.createElement.bind(document);
      const mockVideo = {
        preload: '',
        muted: false,
        videoWidth: 600,
        videoHeight: 900,
        onloadedmetadata: null as (() => void) | null,
        onerror: null as (() => void) | null,
        load: vi.fn(),
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const video = { ...mockVideo, _src: '' };
          Object.defineProperty(video, 'src', {
            get() { return this._src; },
            set(value: string) {
              this._src = value;
              setTimeout(() => this.onloadedmetadata?.(), 0);
            },
          });
          return video as unknown as HTMLVideoElement;
        }
        return originalCreateElement(tag);
      });

      const { result } = renderHook(() => useMediaOrientation('/test.mp4'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.orientation).toBe('landscape'); // fallback

      await vi.advanceTimersByTimeAsync(10);

      expect(result.current.orientation).toBe('portrait');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles video error gracefully', async () => {
      const originalCreateElement = document.createElement.bind(document);
      const mockVideo = {
        preload: '',
        muted: false,
        videoWidth: 0,
        videoHeight: 0,
        onloadedmetadata: null as (() => void) | null,
        onerror: null as (() => void) | null,
        load: vi.fn(),
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const video = { ...mockVideo, _src: '' };
          Object.defineProperty(video, 'src', {
            get() { return this._src; },
            set(value: string) {
              this._src = value;
              setTimeout(() => this.onerror?.(), 0);
            },
          });
          return video as unknown as HTMLVideoElement;
        }
        return originalCreateElement(tag);
      });

      const { result } = renderHook(() => useMediaOrientation('/corrupt.mp4'));

      expect(result.current.isLoading).toBe(true);

      await vi.advanceTimersByTimeAsync(10);

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to load video metadata');
    });
  });
});
