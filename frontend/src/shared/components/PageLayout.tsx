import type { ReactNode } from 'react';
import { ButterflyBackground } from './ButterflyBackground';
import { useTheme } from '@/shared/theme/useTheme';

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

  // Solo mostrar蝴蝶Background si background es butterfly-animated
  // No condicionar a un tema específico - el background style ya lo determina
  const showButterflyAnimation = background === 'butterfly-animated';

  // Get background color from theme
  const bgStyle = background === 'none' 
    ? {} 
    : { backgroundColor: theme.bgColor };

  return (
    <div 
      className="relative h-full min-h-full overflow-x-hidden flex flex-col"
      style={bgStyle}
    >
      {/* Fondo animado con mariposas - solo para tema princess */}
      {showButterflyAnimation && <ButterflyBackground />}

      {/* Fondo decorativo CSS */}
      {background !== 'none' && background !== 'butterfly-animated' && (
        <div className={`absolute inset-0 ${getBackgroundClass()} pointer-events-none`} />
      )}

      {/* Sparkles decorativos adicionales */}
      {showSparkles && background !== 'butterfly-animated' && (
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
