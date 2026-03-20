import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/Button';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { api } from '@/shared/lib/api';

interface ThemeTabProps {
  slug: string;
}

const PRESET_COLORS: Record<string, { from: string; to: string; name: string }> = {
  princess: { from: 'from-pink-400', to: 'to-rose-500', name: 'Princess' },
  elegant: { from: 'from-slate-400', to: 'to-slate-600', name: 'Elegant' },
  party: { from: 'from-purple-500', to: 'to-pink-500', name: 'Party' },
  corporate: { from: 'from-blue-500', to: 'to-indigo-600', name: 'Corporate' },
  kids: { from: 'from-yellow-400', to: 'to-orange-500', name: 'Kids' },
  dark: { from: 'from-slate-700', to: 'to-slate-900', name: 'Dark' },
};

export function ThemeTab({ slug }: ThemeTabProps) {
  const { event, refetchEvent } = useEventAdmin(slug);
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  // Get current theme_id from event
  const currentThemeId = event?.theme_id || null;

  // Map theme_id to preset name (theme_id equals the preset key like "princess", "elegant", etc.)
  const getPresetByThemeId = (themeId: string | null | undefined): string | null => {
    if (!themeId) return null;
    // Check if theme_id matches any preset key
    if (themeId in PRESET_COLORS) {
      return themeId;
    }
    return null;
  };

  const handlePresetClick = async (presetName: string) => {
    if (isApplying) return;
    
    setSelectedPreset(presetName);
    setIsApplying(true);
    
    try {
      // Apply the preset via API
      await api.post(`/admin/events/${slug}/theme/preset`, { preset: presetName });
      // Refetch event to update theme_id
      await refetchEvent();
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setIsApplying(false);
      // Keep selectedPreset to show visual confirmation - will be updated on next refetch
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display text-gray-800 mb-1">Tema Visual</h2>
        <p className="text-sm text-gray-500">
          Personalizá los colores y tipografías de tu evento
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(PRESET_COLORS).map(([key, colors]) => {
          const isSelected = selectedPreset === key || getPresetByThemeId(currentThemeId) === key;
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePresetClick(key)}
              disabled={isApplying}
              className={`h-24 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center relative cursor-pointer transition-all ${
                isApplying ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isSelected 
                  ? 'ring-4 ring-white ring-offset-2 shadow-xl' 
                  : 'hover:shadow-lg'
              }`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-pink-500" />
                </motion.div>
              )}
              <span className="text-white font-medium text-sm drop-shadow">
                {colors.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      <Link to={`/admin/${slug}/theme`} className="block">
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
          Hacé click en un preset para aplicarlo instantáneamente, o usá el
          editor visual para personalizar colores y tipografías.
        </p>
      </div>
    </div>
  );
}


