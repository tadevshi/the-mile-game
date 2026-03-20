import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '@/shared/store/eventStore';

/**
 * LegacyRedirect — lee el evento activo de localStorage y redirige
 * a la ruta event-scoped correspondiente.
 * 
 * Flujo:
 * 1. Lee el slug del evento desde localStorage (currentEvent)
 * 2. Redirige /quiz → /e/:slug/quiz
 * 3. Redirige /ranking → /e/:slug/ranking
 * 4. Redirige /corkboard → /e/:slug/corkboard
 * 5. Si no hay evento activo, redirige a / (landing)
 */
const LEGACY_CURRENT_EVENT_KEY = 'mile-game-current-event';

interface LegacyRedirectProps {
  target: 'quiz' | 'ranking' | 'corkboard' | 'thank-you';
}

export function LegacyRedirect({ target }: LegacyRedirectProps) {
  const navigate = useNavigate();
  const currentEvent = useEventStore((state) => state.currentEvent);

  useEffect(() => {
    const getEventSlug = (): string | null => {
      // 1. Try Zustand store first (if event is already loaded)
      if (currentEvent?.slug) {
        return currentEvent.slug;
      }

      // 2. Try legacy localStorage key (old Mile Game format)
      try {
        const stored = localStorage.getItem(LEGACY_CURRENT_EVENT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.slug || parsed.id || null;
        }
      } catch {
        // Ignore parse errors
      }

      // 3. Try the generic event localStorage
      try {
        const stored = localStorage.getItem('mile-event-slug');
        if (stored) {
          return stored;
        }
      } catch {
        // Ignore
      }

      return null;
    };

    const slug = getEventSlug();

    if (slug) {
      // Redirect to event-scoped route
      switch (target) {
        case 'quiz':
          navigate(`/e/${slug}/quiz`, { replace: true });
          break;
        case 'ranking':
          navigate(`/e/${slug}/ranking`, { replace: true });
          break;
        case 'corkboard':
          navigate(`/e/${slug}/corkboard`, { replace: true });
          break;
        case 'thank-you':
          navigate(`/e/${slug}/thank-you`, { replace: true });
          break;
      }
    } else {
      // No event found — redirect to landing page
      navigate('/', { replace: true });
    }
  }, [currentEvent, target, navigate]);

  // Loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4" />
        <p className="font-serif text-slate-500">Redirigiendo...</p>
      </div>
    </div>
  );
}
