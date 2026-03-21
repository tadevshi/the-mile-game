import { useAnalyticsSummary, useAnalyticsTimeline, useAnalyticsFunnel, useScoreDistribution } from '../hooks/useAnalytics';
import { ActivityChart, ScoreDistributionChart } from '../components/Charts';
import { FunnelChart, StatCard } from '../components/Stats';

interface AnalyticsDashboardProps {
  eventSlug: string;
  eventName?: string;
}

export function AnalyticsDashboard({ eventSlug, eventName }: AnalyticsDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(eventSlug);
  const { data: timeline, isLoading: timelineLoading } = useAnalyticsTimeline(eventSlug, 'hourly');
  const { data: funnel, isLoading: funnelLoading } = useAnalyticsFunnel(eventSlug);
  const { data: scores, isLoading: scoresLoading } = useScoreDistribution(eventSlug);

  const formatTime = (seconds?: number): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          {eventName && (
            <p className="text-gray-500">{eventName}</p>
          )}
        </div>
        <div className="text-sm text-gray-400">
          {summary?.generated_at && (
            <span>Actualizado: {new Date(summary.generated_at).toLocaleString('es-ES')}</span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Participantes"
          value={summary?.total_participants ?? 0}
          icon="👥"
          color="pink"
          loading={summaryLoading}
        />
        <StatCard
          title="Quiz Completados"
          value={summary?.quiz_completed ?? 0}
          subtitle={`${summary?.quiz_completion_rate ?? 0}% del total`}
          icon="✅"
          color="green"
          loading={summaryLoading}
        />
        <StatCard
          title="Score Promedio"
          value={summary?.avg_score ? `${summary.avg_score.toFixed(1)}%` : '-'}
          subtitle={summary?.min_score !== undefined ? `Rango: ${summary.min_score}-${summary.max_score}%` : ''}
          icon="🏆"
          color="purple"
          loading={summaryLoading}
        />
        <StatCard
          title="Postales"
          value={summary?.total_postcards ?? 0}
          subtitle={`${summary?.postcards_viewed ?? 0} vistas`}
          icon="💌"
          color="blue"
          loading={summaryLoading}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Visitas Totales"
          value={summary?.total_page_views ?? 0}
          icon="👁️"
          color="blue"
          loading={summaryLoading}
        />
        <StatCard
          title="Visitantes Únicos"
          value={summary?.unique_visitors ?? 0}
          icon="🧑"
          color="purple"
          loading={summaryLoading}
        />
        <StatCard
          title="Tiempo Promedio"
          value={formatTime(summary?.avg_time_spent_seconds)}
          icon="⏱️"
          color="green"
          loading={summaryLoading}
        />
        <StatCard
          title="Quiz Iniciados"
          value={summary?.quiz_started ?? 0}
          icon="▶️"
          color="pink"
          loading={summaryLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <ActivityChart 
          data={timeline?.entries ?? []} 
          loading={timelineLoading} 
        />

        {/* Score Distribution */}
        <ScoreDistributionChart 
          data={scores?.distribution ?? []} 
          loading={scoresLoading} 
        />
      </div>

      {/* Funnel */}
      <div className="grid md:grid-cols-2 gap-6">
        <FunnelChart 
          steps={funnel?.total_steps ?? []} 
          loading={funnelLoading} 
        />
        
        {/* Quiz Funnel */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quiz Funnel</h3>
          {funnelLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : funnel?.quiz_steps?.length ? (
            <div className="space-y-2">
              {funnel.quiz_steps.map((step, index) => (
                <div key={step.step} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {step.step === 'started' ? 'Iniciaron' : 'Completaron'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{step.count}</span>
                    {index > 0 && step.rate > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        {step.rate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 bg-pink-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">No hay datos de quiz todavía</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
