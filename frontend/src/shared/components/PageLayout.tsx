import type { ReactNode } from 'react';
import { ButterflyBackground } from './ButterflyBackground';
import { useTheme } from '@/shared/theme/useTheme';
import { useEventStore } from '@/shared/store/eventStore';

interface PageLayoutProps {
  children: ReactNode;
  /** Override background style. If not provided, uses theme.backgroundStyle */
  background?: 'watercolor' | 'butterfly' | 'butterfly-animated' | 'none' | 'theme';
  showSparkles?: boolean;
  className?: string;
  /** @deprecated Theme ID - kept for backwards compatibility but not used */
  themeId?: string;
}

export function PageLayout({
  children,
  background = 'theme',
  showSparkles = true,
  className = '',
  themeId: _themeId, // eslint-disable-line @typescript-eslint/no-unused-vars
}: PageLayoutProps) {
  const { currentTheme: theme } = useTheme();
  const { currentEvent } = useEventStore();
  
  // Check if we should show decorative background
  // For dark themes, skip decorative backgrounds to avoid color clashes
  const shouldShowDecorativeBg = (): boolean => {
    if (background === 'none' || background === 'butterfly-animated') {
      return false;
    }
    // Don't show decorative backgrounds for dark themes
    if (theme.backgroundStyle === 'dark' || theme.backgroundStyle === 'minimal') {
      return false;
    }
    return true;
  };

  // Determine background class based on prop or theme
  const getBackgroundClass = (): string => {
    if (background === 'none' || background === 'butterfly-animated') {
      return '';
    }
    if (background === 'theme') {
      return `theme-${theme.backgroundStyle || 'watercolor'}`;
    }
    const bgClasses: Record<string, string> = {
      watercolor: 'watercolor-bg',
      butterfly: 'butterfly-bg',
    };
    return bgClasses[background] || `theme-${theme.backgroundStyle || 'watercolor'}`;
  };

  // Show butterfly animation ONLY when:
  // 1. Explicitly requested via prop (legacy), OR
  // 2. The event's theme is 'princess' (the only theme with butterfly animation)
  const isPrincessTheme = currentEvent?.themeId === 'princess';
  const showButterflyAnimation =
    background === 'butterfly-animated' ||
    (background === 'theme' && isPrincessTheme);

  // Get background color from theme
  const bgStyle = background === 'none' 
    ? {} 
    : { backgroundColor: theme.bgColor };

  return (
    <div 
      className="relative min-h-dvh overflow-x-hidden flex flex-col"
      style={bgStyle}
    >
      {/* Fondo animado con mariposas - solo para tema princess */}
      {showButterflyAnimation && <ButterflyBackground />}

      {/* Fondo decorativo CSS - only for light themes */}
      {shouldShowDecorativeBg() && (
        <div className={`absolute inset-0 ${getBackgroundClass()} pointer-events-none`} />
      )}

      {/* Sparkles decorativos adicionales - only for light themes */}
      {showSparkles && shouldShowDecorativeBg() && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="sparkle-dot w-1 h-1 top-[15%] left-[10%]" />
          <div className="sparkle-dot w-2 h-2 top-[25%] right-[15%]" />
          <div className="sparkle-dot w-1 h-1 top-[8%] right-[25%]" />
          <div className="sparkle-dot w-1.5 h-1.5 top-[35%] left-[20%]" />
          <div className="sparkle-dot w-1 h-1 top-[40%] right-[10%]" />
          <div className="sparkle-dot w-1 h-1 top-[20%] left-[45%]" />
        </div>
      )}

      {/* Contenido */}
      <main className={`relative z-10 flex-1 flex flex-col ${className}`}>
        {children}
      </main>
    </div>
  );
}
