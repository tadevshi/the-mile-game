import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GiftBox } from './GiftBox';
import type { Postcard } from '../types/postcards.types';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style}>{children}</div>
    ),
    span: ({ children, className, style }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} style={style}>{children}</span>
    ),
    p: ({ children, className }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/components/Confetti', () => ({ fireConfetti: vi.fn() }));

const videoPostcard: Postcard = {
  id: 'video-1',
  player_name: 'Video Guest',
  player_avatar: '🎁',
  image_path: '/videos/reveal.mp4',
  message: 'Surprise',
  rotation: 3,
  media_type: 'video',
  thumbnail_path: '/thumbnails/reveal.jpg',
  created_at: '2026-01-01T00:00:00Z',
};

describe('GiftBox', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('uses the video thumbnail for a classic flying postcard', () => {
    render(<GiftBox postcards={[videoPostcard]} onRevealComplete={vi.fn()} />);

    act(() => vi.advanceTimersByTime(2900));

    expect(screen.getByRole('img', { name: 'Video Guest' })).toHaveAttribute('src', '/thumbnails/reveal.jpg');
  });

  it('uses the Polaroid renderer during reveal', () => {
    render(
      <GiftBox
        postcards={[videoPostcard]}
        onRevealComplete={vi.fn()}
        postcardStyle="polaroid"
      />
    );

    act(() => vi.advanceTimersByTime(2900));

    expect(screen.getByTestId('polaroid-card')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Postal de Video Guest' })).toHaveAttribute('src', '/thumbnails/reveal.jpg');
  });
});
