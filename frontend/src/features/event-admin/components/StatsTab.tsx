import { Users, Trophy, Image, Gift } from 'lucide-react';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { Skeleton } from '@/shared/components/Skeleton';

interface StatsTabProps {
  slug: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  loading?: boolean;
}

function StatCard({ icon, label, value, color, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-pink-100">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
            <Skeleton width="18px" height="18px" />
          </div>
          <Skeleton height="12px" width="70%" />
        </div>
        <Skeleton height="28px" width="40%" />
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-pink-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500 truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
    </div>
  );
}

export function StatsTab({ slug }: StatsTabProps) {
  const { stats, isLoadingStats } = useEventAdmin(slug);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display text-gray-800 mb-1">
          Estadísticas
        </h2>
        <p className="text-sm text-gray-500">
          Resumen de actividad del evento
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Jugadores"
          value={stats?.playerCount ?? 0}
          color="bg-pink-500"
          loading={isLoadingStats}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-white" />}
          label="Top Score"
          value={stats?.topScore ?? 0}
          color="bg-amber-500"
          loading={isLoadingStats}
        />
        <StatCard
          icon={<Image className="w-5 h-5 text-white" />}
          label="Postales"
          value={stats?.postcardCount ?? 0}
          color="bg-amber-600"
          loading={isLoadingStats}
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-white" />}
          label="Secretas"
          value={stats?.secretPostcardCount ?? 0}
          color="bg-purple-500"
          loading={isLoadingStats}
        />
      </div>

      {stats && stats.playerCount === 0 && (
        <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 text-sm text-gray-600">
          <p className="font-medium mb-1">📊 Sin datos aún</p>
          <p>
            Las estadísticas se actualizarán a medida que los jugadores
            participen en el evento.
          </p>
        </div>
      )}
    </div>
  );
}
