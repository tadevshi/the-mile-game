import { Outlet, useParams, useLocation, Link } from 'react-router-dom';
import { useEventStore, useFeatureEnabled } from '@/shared/store/eventStore';
import { Button } from '@/shared/components/Button';
import { ThemeProvider } from '@/shared/theme';
import { MobileBottomNav } from './MobileBottomNav';

interface EventLayoutProps {
  children?: React.ReactNode;
}

/**
 * EventLayout - Layout mínimo para navegación entre features de un evento.
 * 
 * NOTA: Este layout NO impone fondo, header ni estilos a las páginas hijas.
 * Cada página mantiene su diseño original (PageLayout con watercolor, etc.).
 * 
 * Estrategia de navegación:
 * - Mobile: Bottom navigation bar con iconos + labels (MobileBottomNav)
 * - Desktop: Barra superior compacta con iconos
 */
export function EventLayout({ children }: EventLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');

  const isQuiz = location.pathname.includes('/quiz');
  const isRanking = location.pathname.includes('/ranking');
  const isCorkboard = location.pathname.includes('/corkboard');
  const isRegister = location.pathname.includes('/register');
  const isThankYou = location.pathname.includes('/thank-you');
  const isSecretBox = location.pathname.includes('/secret-box');
  const hideMobileBottomNav = isCorkboard || isQuiz || isRanking || isRegister || isThankYou || isSecretBox;

  if (!slug) {
    return <div>Error: No event slug provided</div>;
  }

  return (
    <ThemeProvider eventSlug={slug}>
      <div className="relative min-h-dvh" style={{ backgroundColor: 'var(--color-background)' }}>
        {/* Desktop Header - hidden on corkboard to keep focus on the board */}
        <header className={`${isCorkboard ? 'hidden' : 'hidden md:block'} fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b border-[var(--color-border)]/50 dark:border-slate-700/50`}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Navegación izquierda */}
              <nav className="flex items-center gap-2">
                <Link to="/">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-slate-300 text-slate-600 hover:text-accent hover:border-accent"
                  >
                    ←
                  </Button>
                </Link>
                
                <div className="w-px h-4 bg-slate-200 mx-1" />
                
                {quizEnabled && (
                  <Link to={`/e/${slug}/quiz`}>
                    <Button 
                      variant={isQuiz ? 'primary' : 'outline'} 
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      🎯 Quiz
                    </Button>
                  </Link>
                )}
                
                <Link to={`/e/${slug}/ranking`}>
                  <Button 
                    variant={isRanking ? 'primary' : 'outline'} 
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    🏆 Ranking
                  </Button>
                </Link>
                
                {corkboardEnabled && (
                  <Link to={`/e/${slug}/corkboard`}>
                    <Button 
                      variant={isCorkboard ? 'primary' : 'outline'} 
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      📌 Cartelera
                    </Button>
                  </Link>
                )}
              </nav>

              {/* Título del evento (truncado) */}
              {currentEvent?.name && (
                <span className="text-sm font-serif text-slate-500 truncate max-w-[200px]">
                  {currentEvent.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        {!hideMobileBottomNav && <MobileBottomNav slug={slug} />}

        {/* Spacer para compensar la barra fija (desktop) */}
        {!isCorkboard && <div className="hidden md:block h-14" />}

        {/* Main Content - sin wrapper adicional, las páginas manejan su propio layout */}
        <main className={hideMobileBottomNav ? 'md:pb-0' : 'pb-20 md:pb-0'}>
          {children || <Outlet context={{ event: currentEvent }} />}
        </main>
      </div>
    </ThemeProvider>
  );
}
