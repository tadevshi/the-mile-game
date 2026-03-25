import type { FunnelStep } from '../types/analytics.types';

interface FunnelChartProps {
  steps: FunnelStep[];
  loading?: boolean;
}

const STEP_LABELS: Record<string, string> = {
  visitors: 'Visitantes',
  registered: 'Registrados',
  quiz_started: 'Iniciaron Quiz',
  quiz_completed: 'Completaron Quiz',
  postcards: 'Crearon Postales',
};

export function FunnelChart({ steps, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="rounded-xl p-4 flex items-center justify-center h-48" style={{ backgroundColor: 'var(--color-bg)' }}>
        <p className="text-gray-500">No hay datos de conversión todavía</p>
      </div>
    );
  }

  // Find max count for width calculation
  const maxCount = Math.max(...steps.map(s => s.count));
  const maxWidth = 100; // percentage

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Embudo de Conversión</h3>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const width = maxCount > 0 ? (step.count / maxCount) * maxWidth : 0;
          const colors = [
            'bg-pink-500',
            'bg-purple-500',
            'bg-indigo-500',
            'bg-blue-500',
            'bg-green-500',
          ];

          return (
            <div key={step.step} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {STEP_LABELS[step.step] || step.step}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">{step.count}</span>
                  {index > 0 && step.rate > 0 && (
                    <span className="text-xs text-gray-500">
                      ({step.rate.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: 'pink' | 'purple' | 'blue' | 'green';
  loading?: boolean;
}

const COLOR_CLASSES = {
  pink: 'from-pink-500 to-pink-600',
  purple: 'from-purple-500 to-purple-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
};

export function StatCard({ title, value, subtitle, icon, color = 'pink', loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-3 shadow-sm border" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gray-200 animate-pulse rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-gray-200 animate-pulse rounded w-16 mb-1.5" />
            <div className="h-6 bg-gray-200 animate-pulse rounded w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${COLOR_CLASSES[color]} flex items-center justify-center text-white text-base shadow-md shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
          {subtitle && <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
