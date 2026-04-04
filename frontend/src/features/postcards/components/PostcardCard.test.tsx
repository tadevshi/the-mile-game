import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { PostcardCard } from './PostcardCard';
import type { Postcard } from '../types/postcards.types';
import type { Theme } from '@/shared/theme/ThemeProvider';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: { children?: React.ReactNode; className?: string } & Record<string, unknown>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

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

// Mock FramedPhoto component
vi.mock('./FramedPhoto', () => ({
  FramedPhoto: ({ src, caption, isVideo }: { src?: string; caption?: string; isVideo?: boolean }) => (
    <div data-testid="framed-photo" data-src={src} data-caption={caption} data-is-video={String(isVideo)}>
      FramedPhoto: {caption}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

describe('PostcardCard', () => {
  describe('presentation mode branching', () => {
    it('renders postcard mode (split layout) when message is present', () => {
      const postcard = makePostcard({ message: 'Hola mundo' });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      expect(container.textContent).toContain('mensaje:');
      expect(container.textContent).toContain('Hola mundo');
      expect(container.querySelector('[data-testid="framed-photo"]')).not.toBeInTheDocument();
    });

    it('renders photo mode (FramedPhoto) when message is empty', () => {
      const postcard = makePostcard({ message: '' });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      expect(container.querySelector('[data-testid="framed-photo"]')).toBeInTheDocument();
      expect(container.textContent).not.toContain('mensaje:');
    });

    it('renders photo mode (FramedPhoto) when message is whitespace only', () => {
      const postcard = makePostcard({ message: '   ' });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      expect(container.querySelector('[data-testid="framed-photo"]')).toBeInTheDocument();
    });

    it('passes correct props to FramedPhoto in photo mode', () => {
      const postcard = makePostcard({
        message: '',
        sender_name: 'Secret Sender',
        image_path: '/images/photo.jpg',
        media_type: 'image',
        thumbnail_path: '/thumbs/photo.jpg',
        media_duration_ms: 15000,
      });
      const { container } = render(
        <PostcardCard
          postcard={postcard}
          onSelect={vi.fn()}
          theme={makeTheme()}
          eventLogoUrl="/custom-logo.png"
        />
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
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      const framedPhoto = container.querySelector('[data-testid="framed-photo"]');
      expect(framedPhoto).toHaveAttribute('data-is-video', 'true');
      expect(framedPhoto).toHaveAttribute('data-src', '/videos/clip.mp4');
    });
  });

  describe('postcard mode (existing layout preserved)', () => {
    it('shows player name in postcard mode', () => {
      const postcard = makePostcard({ message: 'Feliz cumpleaños!' });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      expect(container.textContent).toContain('Test User');
    });

    it('shows player avatar in postcard mode', () => {
      const postcard = makePostcard({ message: 'Hola', player_avatar: '🎉' });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      expect(container.textContent).toContain('🎉');
    });

    it('calls onSelect when card is clicked', () => {
      const onSelect = vi.fn();
      const postcard = makePostcard({ message: 'Click me' });

      const { container } = render(<PostcardCard postcard={postcard} onSelect={onSelect} theme={makeTheme()} />);

      const card = container.querySelector('.postcard-card');
      if (card) {
        fireEvent.click(card);
      }

      expect(onSelect).toHaveBeenCalledWith(postcard);
    });
  });

  describe('photo mode', () => {
    it('uses sender_name as caption for secret postcards', () => {
      const postcard = makePostcard({
        message: '',
        sender_name: 'Abuela Rosa',
        player_name: 'Anonymous',
      });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      const framedPhoto = container.querySelector('[data-testid="framed-photo"]');
      expect(framedPhoto).toHaveAttribute('data-caption', 'Abuela Rosa');
    });

    it('falls back to player_name when no sender_name', () => {
      const postcard = makePostcard({
        message: '',
        sender_name: undefined,
        player_name: 'Juan Pérez',
      });
      const { container } = render(
        <PostcardCard postcard={postcard} onSelect={vi.fn()} theme={makeTheme()} />
      );

      const framedPhoto = container.querySelector('[data-testid="framed-photo"]');
      expect(framedPhoto).toHaveAttribute('data-caption', 'Juan Pérez');
    });
  });
});
