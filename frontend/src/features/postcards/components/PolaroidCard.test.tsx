import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PolaroidCard } from './PolaroidCard';
import type { Postcard } from '../types/postcards.types';

vi.mock('./VideoPlayer', () => ({
  VideoPlayer: ({ src, thumbnail }: { src: string; thumbnail?: string }) => (
    <div data-testid="video-player" data-src={src} data-thumbnail={thumbnail} />
  ),
}));

afterEach(cleanup);

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    id: 'postcard-1',
    player_name: 'Test User',
    player_avatar: '🎭',
    image_path: '/postcards/photo.jpg',
    message: 'A memorable day',
    rotation: 4,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PolaroidCard', () => {
  it('renders an image with the message caption and sender attribution', () => {
    render(<PolaroidCard postcard={makePostcard({ sender_name: 'Grandma' })} />);

    expect(screen.getByRole('img', { name: 'Postal de Grandma' })).toHaveAttribute('src', '/postcards/photo.jpg');
    expect(screen.getByText('A memorable day')).toBeInTheDocument();
    expect(screen.getByText('- Grandma')).toBeInTheDocument();
  });

  it('renders a video player in expanded mode', () => {
    render(
      <PolaroidCard
        postcard={makePostcard({
          media_type: 'video',
          image_path: '/videos/memory.mp4',
          thumbnail_path: '/thumbnails/memory.jpg',
        })}
        playVideo
      />
    );

    expect(screen.getByTestId('video-player')).toHaveAttribute('data-src', '/videos/memory.mp4');
    expect(screen.getByTestId('video-player')).toHaveAttribute('data-thumbnail', '/thumbnails/memory.jpg');
  });
});
