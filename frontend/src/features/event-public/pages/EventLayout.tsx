import { useParams, useLocation, Link } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { useEventStore, useFeatureEnabled } from '@/shared/store/eventStore';
import { ThemeProvider } from '@/shared/theme';
import { MobileBottomNav } from '@/shared/components/MobileBottomNav';

interface EventLayoutProps {
  children: React.ReactNode;
}

export function EventLayout({ children }: EventLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');

  const isQuiz = location.pathname.includes('/quiz');
  const isRanking = location.pathname.includes('/ranking');
  const isCorkboard = location.pathname.includes('/corkboard');

  if (!slug) {
    return <div>Error: No event slug provided</div>;
  }

  return (
    <ThemeProvider eventSlug={slug}>
      <div className="relative">
        {/* Desktop Header - hidden on mobile, visible on md+ */}
        <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-pink-100/50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <Link to={`/e/${slug}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-pink-300 text-pink-700 hover:text-pink-600 hover:border-pink-400"
                  >
                    ← Inicio
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

              {currentEvent?.name && (
                <span className="hidden sm:block text-sm font-serif text-slate-500 truncate max-w-[200px]">
                  {currentEvent.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav slug={slug} />

        {/* Spacer para compensar la barra fija (desktop) */}
        <div className="hidden md:block h-14" />

        <main className="pb-20 md:pb-0">{children}</main>
      </div>
    </ThemeProvider>
  );
}
