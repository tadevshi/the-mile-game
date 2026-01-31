import type { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  background?: 'watercolor' | 'butterfly' | 'none';
  showSparkles?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  background = 'watercolor',
  showSparkles = true,
  className = '',
}: PageLayoutProps) {
  const bgClasses = {
    watercolor: 'watercolor-bg',
    butterfly: 'butterfly-bg',
    none: '',
  };

  return (
    <div className="relative min-h-screen bg-background-light dark:bg-background-dark overflow-x-hidden">
      {/* Fondo decorativo */}
      {background !== 'none' && (
        <div className={`absolute inset-0 ${bgClasses[background]} pointer-events-none`} />
      )}

      {/* Sparkles decorativos */}
      {showSparkles && (
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
      <main className={`relative z-10 min-h-screen flex flex-col ${className}`}>
        {children}
      </main>
    </div>
  );
}
