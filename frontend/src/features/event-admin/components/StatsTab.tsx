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
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-pink-100">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
            <Skeleton width="20px" height="20px" />
          </div>
          <Skeleton height="14px" width="60%" />
        </div>
        <Skeleton height="32px" width="50%" />
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-pink-100">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
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
