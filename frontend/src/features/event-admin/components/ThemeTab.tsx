import { Link } from 'react-router-dom';
import { Palette } from 'lucide-react';
import { Button } from '@/shared/components/Button';

interface ThemeTabProps {
  slug: string;
}

const PRESET_COLORS: Record<string, { from: string; to: string }> = {
  princess: { from: 'from-pink-400', to: 'to-rose-500' },
  elegant: { from: 'from-slate-400', to: 'to-slate-600' },
  party: { from: 'from-purple-500', to: 'to-pink-500' },
  corporate: { from: 'from-blue-500', to: 'to-indigo-600' },
  kids: { from: 'from-yellow-400', to: 'to-orange-500' },
  dark: { from: 'from-slate-700', to: 'to-slate-900' },
  default: { from: 'from-pink-400', to: 'to-rose-500' },
};

export function ThemeTab({ slug }: ThemeTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display text-gray-800 mb-1">Tema Visual</h2>
        <p className="text-sm text-gray-500">
          Personalizá los colores y tipografías de tu evento
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(PRESET_COLORS).map(([name, colors]) => (
          <div
            key={name}
            className={`h-24 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center`}
          >
            <span className="text-white font-medium capitalize text-sm drop-shadow">
              {name}
            </span>
          </div>
        ))}
      </div>

      <Link to={`/admin/event/${slug}/theme`} className="block">
        <Button
          variant="primary"
          fullWidth
          icon={<Palette className="w-4 h-4" />}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200"
        >
          Personalizar Tema
        </Button>
      </Link>

      <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">💡 Consejo</p>
        <p>
          Ajustá colores, tipografías y estilos desde el editor visual. Los
          cambios se ven en tiempo real.
        </p>
      </div>
    </div>
  );
}
