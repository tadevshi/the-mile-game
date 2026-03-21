// Analytics API types

export interface AnalyticsSummary {
  event_id: string;
  total_participants: number;
  quiz_started: number;
  quiz_completed: number;
  quiz_completion_rate: number;
  avg_score: number;
  min_score?: number;
  max_score?: number;
  avg_time_spent_seconds?: number;
  total_postcards: number;
  postcards_viewed: number;
  total_page_views: number;
  unique_visitors: number;
  generated_at: string;
}

export interface TimelineEntry {
  timestamp: string;
  period: string;
  page_views: number;
  new_players: number;
  quiz_starts: number;
  quiz_finishes: number;
  postcards: number;
}

export interface TimelineResponse {
  event_id: string;
  period: string;
  entries: TimelineEntry[];
}

export interface FunnelStep {
  step: string;
  count: number;
  rate: number;
}

export interface FunnelResponse {
  event_id: string;
  total_steps: FunnelStep[];
  quiz_steps: FunnelStep[];
}

export interface ScoreDistribution {
  bucket: string;
  count: number;
}

export interface ScoreDistributionResponse {
  event_id: string;
  distribution: ScoreDistribution[];
}
