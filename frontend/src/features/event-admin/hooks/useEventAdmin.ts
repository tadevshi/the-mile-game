import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export type AdminTab = 'config' | 'questions' | 'theme' | 'stats' | 'analytics';

export interface EventStats {
  playerCount: number;
  topScore: number;
  postcardCount: number;
  secretPostcardCount: number;
}

export function useEventAdmin(slug: string) {
  const eventQuery = useQuery({
    queryKey: ['event', slug],
    queryFn: () => api.getEventBySlug(slug),
    enabled: !!slug,
  });

  const statsQuery = useQuery<EventStats>({
    queryKey: ['event-stats', slug],
    queryFn: async () => {
      const [ranking, postcards] = await Promise.all([
        api.getRankingScoped(slug).catch(() => []),
        api.listPostcardsScoped(slug).catch(() => []),
      ]);

      const scores = ranking.map((r) => r.player.score).filter((s) => s > 0);
      return {
        playerCount: ranking.length,
        topScore: scores.length > 0 ? Math.max(...scores) : 0,
        postcardCount: postcards.length,
        secretPostcardCount: 0,
      };
    },
    enabled: !!slug,
  });

  const questionsQuery = useQuery({
    queryKey: ['questions', slug],
    queryFn: () => api.listQuestions(slug),
    enabled: !!slug,
  });

  return {
    event: eventQuery.data,
    stats: statsQuery.data,
    questions: questionsQuery.data ?? [],
    isLoadingEvent: eventQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingQuestions: questionsQuery.isLoading,
    errorEvent: eventQuery.error,
    refetchEvent: eventQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}
