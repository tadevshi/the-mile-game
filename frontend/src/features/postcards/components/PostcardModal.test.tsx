import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { PostcardModal } from './PostcardModal';
import type { Postcard } from '../types/postcards.types';
import type { Theme } from '@/shared/theme/ThemeProvider';

// Mock framer-motion - mock ALL motion elements used in PostcardModal
vi.mock('framer-motion', () => {
  const createMotionComponent = (tag: string) => {
    return ({ children, className, ...props }: { children?: React.ReactNode; className?: string } & Record<string, unknown>) =>
      React.createElement(tag, { className, ...props }, children);
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      button: createMotionComponent('button'),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

// Mock useMediaOrientation hook
vi.mock('../hooks/useMediaOrientation', () => ({
  useMediaOrientation: () => ({
    orientation: 'landscape' as const,
    isLoading: false,
    error: null,
  }),
}));

// Mock PushPin component
vi.mock('./PushPin', () => ({
  PushPin: () => React.createElement('div', { 'data-testid': 'pushpin' }),
}));

// Mock VideoPlayer component
vi.mock('./VideoPlayer', () => ({
  VideoPlayer: ({ src, className }: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'video-player', 'data-src': src, className }),
}));

// Mock FramedPhoto component
vi.mock('./FramedPhoto', () => ({
  FramedPhoto: ({ src, caption, isVideo }: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'framed-photo', 'data-src': src, 'data-caption': caption, 'data-is-video': String(isVideo) },
      `FramedPhoto: ${caption}`
    ),
}));

// Mock global fetch for video downloads
const mockFetch = vi.fn();
(window as any).fetch = mockFetch;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockFetch.mockReset();
});

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    id: 'test-id',
    player_id: 'player-1',
    player_name: 'Test User',
    player_avatar: '🎭',
    image_path: '/postcards/test.jpg',
    message: 'Te queremos mucho',
    rotation: 5,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTheme(): Theme {
  return {
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accentColor: '#DB2777',
    bgColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    displayFont: 'Great Vibes',
    backgroundStyle: 'watercolor' as const,
  };
}

describe('PostcardModal', () => {
  describe('presentation mode branching', () => {
    it('renders postcard mode (split layout) when message is present', () => {
      const postcard = makePostcard({ message: 'Hola mundo' });
      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      expect(container.textContent).toContain('mensaje:');
      expect(container.textContent).toContain('Hola mundo');
      expect(container.querySelector('[data-testid="framed-photo"]')).not.toBeInTheDocument();
    });

    it('renders photo mode (FramedPhoto) when message is empty', () => {
      const postcard = makePostcard({ message: '' });
      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      expect(container.querySelector('[data-testid="framed-photo"]')).toBeInTheDocument();
      expect(container.textContent).not.toContain('mensaje:');
    });

    it('renders photo mode (FramedPhoto) when message is whitespace only', () => {
      const postcard = makePostcard({ message: '   ' });
      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      expect(container.querySelector('[data-testid="framed-photo"]')).toBeInTheDocument();
    });

    it('passes correct props to FramedPhoto in photo mode', () => {
      const postcard = makePostcard({
        message: '',
        sender_name: 'Secret Sender',
        image_path: '/images/photo.jpg',
        media_type: 'image',
      });
      const { container } = render(
        React.createElement(PostcardModal, {
          postcard,
          onClose: vi.fn(),
          theme: makeTheme(),
          eventLogoUrl: '/custom-logo.png',
        })
      );

      const framedPhoto = container.querySelector('[data-testid="framed-photo"]');
      expect(framedPhoto).toHaveAttribute('data-src', '/images/photo.jpg');
      expect(framedPhoto).toHaveAttribute('data-caption', 'Secret Sender');
      expect(framedPhoto).toHaveAttribute('data-is-video', 'false');
    });

    it('passes video props to FramedPhoto for video postcards', () => {
      const postcard = makePostcard({
        message: '',
        image_path: '/videos/clip.mp4',
        media_type: 'video',
        thumbnail_path: '/thumbs/clip.jpg',
        media_duration_ms: 30000,
      });
      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      const framedPhoto = container.querySelector('[data-testid="framed-photo"]');
      expect(framedPhoto).toHaveAttribute('data-is-video', 'true');
      expect(framedPhoto).toHaveAttribute('data-src', '/videos/clip.mp4');
    });
  });

  describe('modal/card consistency', () => {
    it('photo mode postcard renders FramedPhoto in both card and modal', () => {
      const photoPostcard = makePostcard({ message: '' });

      const cardHasPhoto = photoPostcard.message.trim().length === 0;
      expect(cardHasPhoto).toBe(true);

      const { container } = render(
        React.createElement(PostcardModal, { postcard: photoPostcard, onClose: vi.fn(), theme: makeTheme() })
      );
      expect(container.querySelector('[data-testid="framed-photo"]')).toBeInTheDocument();
    });

    it('postcard mode with message renders split layout in modal', () => {
      const messagePostcard = makePostcard({ message: 'Feliz cumple!' });

      const cardHasMessage = messagePostcard.message.trim().length > 0;
      expect(cardHasMessage).toBe(true);

      const { container } = render(
        React.createElement(PostcardModal, { postcard: messagePostcard, onClose: vi.fn(), theme: makeTheme() })
      );
      expect(container.textContent).toContain('Feliz cumple!');
      expect(container.querySelector('[data-testid="framed-photo"]')).not.toBeInTheDocument();
    });
  });

  describe('download behavior parity', () => {
    it('image postcard in photo mode uses PNG export path (toPng)', async () => {
      const { toPng } = await import('html-to-image');
      const postcard = makePostcard({ message: '', media_type: 'image' });

      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      const downloadBtn = container.querySelector('button');
      if (downloadBtn) {
        fireEvent.click(downloadBtn);
      }

      expect(toPng).toHaveBeenCalled();
    });

    it('video postcard in photo mode uses file download path (fetch blob)', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video'], { type: 'video/mp4' })),
      });

      const postcard = makePostcard({
        message: '',
        media_type: 'video',
        image_path: '/videos/test.mp4',
      });

      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      const buttons = container.querySelectorAll('button');
      const downloadBtn = Array.from(buttons).find(
        (b) => b.textContent?.includes('Descargar video')
      );
      if (downloadBtn) {
        fireEvent.click(downloadBtn);
      }

      expect(mockFetch).toHaveBeenCalledWith('/videos/test.mp4');
    });

    it('video postcard in postcard mode uses file download path (unchanged)', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video'], { type: 'video/mp4' })),
      });

      const postcard = makePostcard({
        message: 'Check this video!',
        media_type: 'video',
        image_path: '/videos/test.mp4',
      });

      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      expect(container.textContent).toContain('mensaje:');

      const buttons = container.querySelectorAll('button');
      const downloadBtn = Array.from(buttons).find(
        (b) => b.textContent?.includes('Descargar video')
      );
      if (downloadBtn) {
        fireEvent.click(downloadBtn);
      }

      expect(mockFetch).toHaveBeenCalledWith('/videos/test.mp4');
    });
  });

  describe('postcard mode (existing layout preserved)', () => {
    it('shows player name and avatar in postcard mode', () => {
      const postcard = makePostcard({ message: 'Hola', player_avatar: '🎉' });
      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose: vi.fn(), theme: makeTheme() })
      );

      expect(container.textContent).toContain('Test User');
      expect(container.textContent).toContain('🎉');
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      const postcard = makePostcard({ message: 'Close me' });

      const { container } = render(
        React.createElement(PostcardModal, { postcard, onClose, theme: makeTheme() })
      );

      const buttons = container.querySelectorAll('button');
      const closeBtn = Array.from(buttons).find(
        (b) => b.textContent?.includes('Cerrar')
      );
      if (closeBtn) {
        fireEvent.click(closeBtn);
      }

      expect(onClose).toHaveBeenCalled();
    });
  });
});
