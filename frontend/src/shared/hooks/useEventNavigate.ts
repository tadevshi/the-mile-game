import { useNavigate, useParams, type NavigateOptions } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';

/**
 * Custom hook that wraps react-router's useNavigate to automatically
 * prepend the event slug when navigating within an event context.
 * 
 * Usage:
 *   const navigate = useEventNavigate();
 *   navigate('/register'); // → /event/mile-2026/register (if slug=mile-2026)
 *   navigate('/event/other/quiz'); // → navigates as-is
 *   navigate('/'); // → /event/mile-2026 (if in event context)
 */
export function useEventNavigate() {
  const navigate = useNavigate();
  const params = useParams();
  const currentEvent = useEventStore((state) => state.currentEvent);

  // Get the event slug from URL params first, then from store
  const eventSlug = params.slug || currentEvent?.slug;

  return (to: string, options?: NavigateOptions) => {
    // Only modify paths that:
    // 1. Start with '/' (absolute paths)
    // 2. Don't already start with '/event/' (avoid double-prefixing)
    // 3. We have an event slug available
    if (to.startsWith('/') && !to.startsWith('/event/') && eventSlug) {
      // Prepend /event/{slug} to the path
      // Only pass options if defined to maintain compatibility with tests
      if (options !== undefined) {
        navigate(`/event/${eventSlug}${to}`, options);
      } else {
        navigate(`/event/${eventSlug}${to}`);
      }
    } else {
      // Navigate as-is (relative paths, /event/ paths, or no event context)
      if (options !== undefined) {
        navigate(to, options);
      } else {
        navigate(to);
      }
    }
  };
}
