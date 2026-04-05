import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FramedPhoto } from './FramedPhoto';

// Mock framer-motion to avoid animation complexities in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: { children?: React.ReactNode; className?: string } & Record<string, unknown>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

// Mock VideoPlayer component
vi.mock('./VideoPlayer', () => ({
  VideoPlayer: ({ src, thumbnail, durationMs, className }: { src?: string; thumbnail?: string; durationMs?: number; className?: string }) => (
    <div className={className} data-testid="video-player" data-src={src}>
      {thumbnail && <img src={thumbnail} alt="video-thumbnail" />}
      {durationMs && <span data-testid="duration-badge">{durationMs}</span>}
    </div>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function makeMinimalTheme() {
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

describe('FramedPhoto', () => {
  describe('image rendering', () => {
    it('renders image with correct src and alt', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="María García"
          theme={makeMinimalTheme()}
        />
      );

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/postcards/test.jpg');
      expect(img).toHaveAttribute('alt', 'Foto de María García');
    });

    it('uses fallback src when image fails to load', async () => {
      const { container } = render(
        <FramedPhoto
          src="/broken-image.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test User"
          theme={makeMinimalTheme()}
          eventLogoUrl="/custom-logo.png"
        />
      );

      const img = container.querySelector('img')!;
      // Simulate error event
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(img).toHaveAttribute('src', '/custom-logo.png');
      });
    });

    it('uses default fallback when no eventLogoUrl provided', async () => {
      const { container } = render(
        <FramedPhoto
          src="/broken-image.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test User"
          theme={makeMinimalTheme()}
        />
      );

      const img = container.querySelector('img')!;
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(img).toHaveAttribute('src', '/logo.png');
      });
    });
  });

  describe('video rendering', () => {
    it('renders VideoPlayer for video media', () => {
      const { container } = render(
        <FramedPhoto
          src="/videos/test.mp4"
          isVideo={true}
          orientation="landscape"
          caption="Juan Pérez"
          theme={makeMinimalTheme()}
          thumbnailPath="/thumbnails/test.jpg"
          durationMs={15000}
        />
      );

      const videoPlayer = container.querySelector('[data-testid="video-player"]');
      expect(videoPlayer).toBeInTheDocument();
      expect(videoPlayer).toHaveAttribute('data-src', '/videos/test.mp4');
    });

    it('passes thumbnail and duration to VideoPlayer', () => {
      const { container } = render(
        <FramedPhoto
          src="/videos/test.mp4"
          isVideo={true}
          orientation="landscape"
          caption="Juan Pérez"
          theme={makeMinimalTheme()}
          thumbnailPath="/thumbnails/test.jpg"
          durationMs={15000}
        />
      );

      const thumbnail = container.querySelector('img[alt="video-thumbnail"]');
      expect(thumbnail).toHaveAttribute('src', '/thumbnails/test.jpg');

      const duration = container.querySelector('[data-testid="duration-badge"]');
      expect(duration).toHaveTextContent('15000');
    });

    it('shows "video" label below caption for video media', () => {
      const { container } = render(
        <FramedPhoto
          src="/videos/test.mp4"
          isVideo={true}
          orientation="landscape"
          caption="Juan Pérez"
          theme={makeMinimalTheme()}
        />
      );

      // Find the video label within this render's container
      const paragraphs = container.querySelectorAll('p');
      const videoLabel = Array.from(paragraphs).find(
        (p) => p.textContent === 'video'
      );
      expect(videoLabel).toBeInTheDocument();
    });
  });

  describe('orientation-based aspect ratios', () => {
    it('applies portrait aspect ratio', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/portrait.jpg"
          isVideo={false}
          orientation="portrait"
          caption="Test"
          theme={makeMinimalTheme()}
        />
      );

      const mediaContainer = container.querySelector('.aspect-\\[3\\/4\\]');
      expect(mediaContainer).toBeInTheDocument();
    });

    it('applies landscape aspect ratio', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/landscape.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test"
          theme={makeMinimalTheme()}
        />
      );

      const mediaContainer = container.querySelector('.aspect-\\[4\\/3\\]');
      expect(mediaContainer).toBeInTheDocument();
    });

    it('applies square aspect ratio when orientation is square', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/square.jpg"
          isVideo={false}
          orientation="square"
          caption="Test"
          theme={makeMinimalTheme()}
        />
      );

      const mediaContainer = container.querySelector('.aspect-square');
      expect(mediaContainer).toBeInTheDocument();
    });

    it('applies square aspect ratio as fallback when orientation is null', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/unknown.jpg"
          isVideo={false}
          orientation={null}
          caption="Test"
          theme={makeMinimalTheme()}
        />
      );

      const mediaContainer = container.querySelector('.aspect-square');
      expect(mediaContainer).toBeInTheDocument();
    });
  });

  describe('caption display', () => {
    it('renders caption text below the frame', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="María García"
          theme={makeMinimalTheme()}
        />
      );

      const paragraphs = container.querySelectorAll('p');
      const caption = Array.from(paragraphs).find(
        (p) => p.textContent === 'María García'
      );
      expect(caption).toBeInTheDocument();
    });

    it('uses theme textColor for caption', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test User"
          theme={{ ...makeMinimalTheme(), textColor: '#FF0000' }}
        />
      );

      const paragraphs = container.querySelectorAll('p');
      const caption = Array.from(paragraphs).find(
        (p) => p.textContent === 'Test User'
      );
      expect(caption).toHaveStyle({ color: '#FF0000' });
    });

    it('uses default textColor when theme is undefined', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test User"
        />
      );

      const paragraphs = container.querySelectorAll('p');
      const caption = Array.from(paragraphs).find(
        (p) => p.textContent === 'Test User'
      );
      // Default is #1E293B
      expect(caption).toHaveStyle({ color: '#1E293B' });
    });
  });

  describe('accessibility', () => {
    it('has img role with descriptive alt text for images', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="María García"
          theme={makeMinimalTheme()}
        />
      );

      const frame = container.querySelector('[role="img"]');
      expect(frame).toHaveAttribute('aria-label', 'Foto de María García');
    });

    it('has group role with descriptive label for videos', () => {
      const { container } = render(
        <FramedPhoto
          src="/videos/test.mp4"
          isVideo={true}
          orientation="landscape"
          caption="Juan Pérez"
          theme={makeMinimalTheme()}
        />
      );

      const frame = container.querySelector('[role="group"]');
      expect(frame).toHaveAttribute('aria-label', 'Video de Juan Pérez');
    });
  });

  describe('frame styling', () => {
    it('renders white frame with shadow', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test"
          theme={makeMinimalTheme()}
        />
      );

      const frame = container.querySelector('.bg-white.p-2.shadow-md');
      expect(frame).toBeInTheDocument();
    });

    it('applies additional className when provided', () => {
      const { container } = render(
        <FramedPhoto
          src="/postcards/test.jpg"
          isVideo={false}
          orientation="landscape"
          caption="Test"
          theme={makeMinimalTheme()}
          className="custom-class"
        />
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
