import { Outlet, useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEventStore, useFeatureEnabled } from '@/shared/store/eventStore';
import { ButterflyBackground } from '@/shared/components/ButterflyBackground';
import { Button } from '@/shared/components/Button';

export function EventLayout() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');

  // Determine which page we're on for nav highlighting
  const isQuiz = location.pathname.includes('/quiz');
  const isRanking = location.pathname.includes('/ranking');
  const isCorkboard = location.pathname.includes('/corkboard');

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ButterflyBackground />
      
      {/* Event Header */}
      <header className="relative z-10 pt-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            {/* Event Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-display text-accent">
                {currentEvent?.name || slug}
              </h1>
              {currentEvent?.description && (
                <p className="text-sm font-serif text-slate-500 italic">
                  {currentEvent.description}
                </p>
              )}
            </div>
            
            {/* Back to Welcome */}
            <Link to="/">
              <Button variant="ghost" size="sm">
                ← Inicio
              </Button>
            </Link>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 overflow-x-auto pb-2">
            {quizEnabled && (
              <Link to={`/event/${slug}/quiz`}>
                <Button 
                  variant={isQuiz ? 'primary' : 'secondary'} 
                  size="sm"
                  className="whitespace-nowrap"
                >
                  🎯 Jugar Quiz
                </Button>
              </Link>
            )}
            
            <Link to={`/event/${slug}/ranking`}>
              <Button 
                variant={isRanking ? 'primary' : 'secondary'} 
                size="sm"
                className="whitespace-nowrap"
              >
                🏆 Ranking
              </Button>
            </Link>
            
            {corkboardEnabled && (
              <Link to={`/event/${slug}/corkboard`}>
                <Button 
                  variant={isCorkboard ? 'primary' : 'secondary'} 
                  size="sm"
                  className="whitespace-nowrap"
                >
                  📌 Cartelera
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <Outlet context={{ event: currentEvent }} />
        </motion.div>
      </main>
    </div>
  );
}
