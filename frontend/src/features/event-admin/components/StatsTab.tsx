import { Users, Trophy, Image, Gift } from 'lucide-react';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { Skeleton } from '@/shared/components/Skeleton';
import type { PreviewTheme } from '@/themes';

interface StatsTabProps {
  slug: string;
  previewTheme?: PreviewTheme;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bgColor: string;
  loading?: boolean;
  theme: PreviewTheme;
}

function StatCard({ icon, label, value, bgColor, loading, theme }: StatCardProps) {
  if (loading) {
    return (
      <div className="backdrop-blur-sm rounded-xl p-4 border" style={{ 
        backgroundColor: `${theme.secondaryColor}30`,
        borderColor: `${theme.secondaryColor}50`
      }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bgColor }}>
            <Skeleton width="18px" height="18px" />
          </div>
          <Skeleton height="12px" width="70%" />
        </div>
        <Skeleton height="28px" width="40%" />
      </div>
    );
  }

  return (
    <div className="backdrop-blur-sm rounded-xl p-4 border" style={{ 
      backgroundColor: `${theme.secondaryColor}30`,
      borderColor: `${theme.secondaryColor}50`
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bgColor }}>
          {icon}
        </div>
        <span className="text-xs font-medium truncate" style={{ color: `${theme.textColor}80` }}>{label}</span>
      </div>
      <p className="text-2xl font-bold leading-tight" style={{ color: theme.textColor }}>{value}</p>
    </div>
  );
}

export function StatsTab({ slug, previewTheme }: StatsTabProps) {
  const { stats, isLoadingStats } = useEventAdmin(slug);

  // Use preview theme colors or fallbacks
  const theme: PreviewTheme = previewTheme || {
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accentColor: '#DB2777',
    bgColor: '#FFF5F7',
    textColor: '#1E293B',
    displayFont: 'Great Vibes',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    backgroundStyle: 'watercolor',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display mb-1" style={{ color: theme.textColor }}>
          Estadísticas
        </h2>
        <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
          Resumen de actividad del evento
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Jugadores"
          value={stats?.playerCount ?? 0}
          bgColor={theme.primaryColor}
          loading={isLoadingStats}
          theme={theme}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-white" />}
          label="Top Score"
          value={stats?.topScore ?? 0}
          bgColor={theme.accentColor}
          loading={isLoadingStats}
          theme={theme}
        />
        <StatCard
          icon={<Image className="w-5 h-5 text-white" />}
          label="Postales"
          value={stats?.postcardCount ?? 0}
          bgColor={theme.secondaryColor}
          loading={isLoadingStats}
          theme={theme}
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-white" />}
          label="Secretas"
          value={stats?.secretPostcardCount ?? 0}
          bgColor={theme.accentColor}
          loading={isLoadingStats}
          theme={theme}
        />
      </div>

      {stats && stats.playerCount === 0 && (
        <div className="rounded-xl p-4 text-sm" style={{ 
          backgroundColor: `${theme.primaryColor}15`,
          border: `1px solid ${theme.primaryColor}30`,
          color: theme.textColor
        }}>
          <p className="font-medium mb-1">📊 Sin datos aún</p>
          <p style={{ color: `${theme.textColor}80` }}>
            Las estadísticas se actualizarán a medida que los jugadores
            participen en el evento.
          </p>
        </div>
      )}
    </div>
  );
}
