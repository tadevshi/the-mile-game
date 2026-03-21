import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import type { TimelineEntry } from '../types/analytics.types';

interface ActivityChartProps {
  data: TimelineEntry[];
  loading?: boolean;
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-64 bg-pink-50 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">No hay datos de actividad todavía</p>
      </div>
    );
  }

  const formattedData = data.map((entry) => ({
    ...entry,
    time: new Date(entry.timestamp).toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Actividad en el tiempo</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11 }} 
            stroke="#9ca3af"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              fontSize: 12
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="page_views" 
            stroke="#ec4899" 
            strokeWidth={2} 
            dot={{ fill: '#ec4899', r: 3 }}
            name="Visitas"
          />
          <Line 
            type="monotone" 
            dataKey="quiz_starts" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 3 }}
            name="Quiz iniciados"
          />
          <Line 
            type="monotone" 
            dataKey="postcards" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
            name="Postales"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ScoreDistributionChartProps {
  data: { bucket: string; count: number }[];
  loading?: boolean;
}

export function ScoreDistributionChart({ data, loading }: ScoreDistributionChartProps) {
  if (loading) {
    return <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-48 bg-pink-50 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">No hay scores todavía</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Scores</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis 
            dataKey="bucket" 
            type="category" 
            tick={{ fontSize: 11 }} 
            stroke="#9ca3af"
            width={50}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              fontSize: 12
            }}
          />
          <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} name="Jugadores" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
