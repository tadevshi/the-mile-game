import { useNavigate, useParams, type NavigateOptions } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';

/**
 * Custom hook that wraps react-router's useNavigate to automatically
 * prepend the event slug when navigating within an event context.
 * 
 * Usage:
 *   const navigate = useEventNavigate();
 *   navigate('/register'); // → /e/mile-2026/register (if slug=mile-2026)
 *   navigate('/e/other/quiz'); // → navigates as-is
 *   navigate('/'); // → /e/mile-2026 (if in event context)
 * 
 * IMPORTANT: This hook subscribes only to the event slug (string) to avoid
 * triggering re-renders when the full event object changes. This prevents
 * infinite loops in useEffects that depend on the navigate function.
 */
export function useEventNavigate() {
  const navigate = useNavigate();
  const params = useParams();
  
  // Subscribe ONLY to the slug string, not the full event object.
  // Using a string primitive avoids the infinite loop issue where
  // the hook would return a new function reference on every event object change.
  const eventSlugFromStore = useEventStore((state) => state.currentEvent?.slug);

  // Get the event slug from URL params first, then from store
  const eventSlug = params.slug || eventSlugFromStore;

  // useNavigate and useParams are stable (don't change between renders)
  // eventSlug is a string primitive, so comparison is stable
  // This function reference will remain stable as long as eventSlug doesn't change
  const navigateWithSlug = (to: string, options?: NavigateOptions) => {
    // Only modify paths that:
    // 1. Start with '/' (absolute paths)
    // 2. Don't already start with '/e/' (avoid double-prefixing)
    // 3. We have an event slug available
    if (to.startsWith('/') && !to.startsWith('/e/') && eventSlug) {
      // Prepend /e/{slug} to the path
      // Only pass options if defined to maintain compatibility with tests
      if (options !== undefined) {
        navigate(`/e/${eventSlug}${to}`, options);
      } else {
        navigate(`/e/${eventSlug}${to}`);
      }
    } else {
      // Navigate as-is (relative paths, /e/ paths, or no event context)
      if (options !== undefined) {
        navigate(to, options);
      } else {
        navigate(to);
      }
    }
  };

  return navigateWithSlug;
}
