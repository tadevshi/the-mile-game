import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import type { AnalyticsSummary, TimelineResponse, FunnelResponse, ScoreDistributionResponse } from '../types/analytics.types';

export function useAnalyticsSummary(eventSlug: string) {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary', eventSlug],
    queryFn: () => api.get<AnalyticsSummary>(`/admin/events/${eventSlug}/analytics`).then(r => r.data),
    enabled: !!eventSlug,
    staleTime: 30000, // 30 seconds
  });
}

export function useAnalyticsTimeline(eventSlug: string, period: 'hourly' | 'daily' = 'hourly') {
  return useQuery<TimelineResponse>({
    queryKey: ['analytics', 'timeline', eventSlug, period],
    queryFn: () => api.get<TimelineResponse>(`/admin/events/${eventSlug}/analytics/timeline?period=${period}`).then(r => r.data),
    enabled: !!eventSlug,
    staleTime: 30000,
  });
}

export function useAnalyticsFunnel(eventSlug: string) {
  return useQuery<FunnelResponse>({
    queryKey: ['analytics', 'funnel', eventSlug],
    queryFn: () => api.get<FunnelResponse>(`/admin/events/${eventSlug}/analytics/funnel`).then(r => r.data),
    enabled: !!eventSlug,
    staleTime: 30000,
  });
}

export function useScoreDistribution(eventSlug: string) {
  return useQuery<ScoreDistributionResponse>({
    queryKey: ['analytics', 'scores', eventSlug],
    queryFn: () => api.get<ScoreDistributionResponse>(`/admin/events/${eventSlug}/analytics/scores`).then(r => r.data),
    enabled: !!eventSlug,
    staleTime: 30000,
  });
}
