import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../store/wizardStore';
import { api } from '@/shared/lib/api';
import type { ThemePreset } from '@/shared/theme';
import { THEME_PRESETS } from '@/shared/theme';

export function Step3_Theme() {
  const { formData, updateFormData } = useWizardStore();
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await api.get<{ presets: ThemePreset[] }>('/themes/presets');
        setPresets(response.data.presets || []);
      } catch (err) {
        console.error('Failed to load presets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPresets();
  }, []);

  const selectedThemeId = formData.themeId;

  const handleSelect = (preset: ThemePreset) => {
    updateFormData({ themeId: preset.name });
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="text-center mb-8">
          <h2 
            className="text-2xl font-display mb-1"
            style={{ color: 'var(--color-on-background)' }}
          >
            Tema Visual
          </h2>
          <p 
            className="text-sm"
            style={{ color: 'var(--color-on-surface-muted)' }}
          >
            Elegí el estilo de tu evento
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="h-32 rounded-xl animate-pulse"
              style={{ backgroundColor: 'var(--color-border-light)' }} 
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 
          className="text-2xl font-display mb-1"
          style={{ color: 'var(--color-on-background)' }}
        >
          Tema Visual
        </h2>
        <p 
          className="text-sm"
          style={{ color: 'var(--color-on-surface-muted)' }}
        >
          Elegí el estilo que mejor represente tu evento
        </p>
      </div>

      {presets.length === 0 ? (
        <div 
          className="text-center py-8"
          style={{ color: 'var(--color-on-surface-muted)' }}
        >
          <p>No hay temas disponibles. Se usará el tema por defecto.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {presets.map((preset) => {
            const presetData = THEME_PRESETS.find(p => p.name === preset.name);
            const isSelected = selectedThemeId === preset.name;

            return (
              <button
                key={preset.name}
                onClick={() => handleSelect(preset)}
                className={`
                  relative rounded-xl p-4 border-2 transition-all duration-200
                  hover:shadow-lg hover:scale-[1.02]
                  text-left
                  ${isSelected
                    ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }
                `}
                style={{
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div
                  className={`h-20 rounded-lg mb-3 bg-gradient-to-br ${presetData?.gradientFrom || 'from-pink-400'} ${presetData?.gradientTo || 'to-rose-500'}`}
                />
                <p 
                  className="text-sm font-medium capitalize"
                  style={{ color: 'var(--color-on-surface)' }}
                >
                  {preset.name}
                </p>
                {isSelected && (
                  <div 
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedThemeId && (
        <div 
          className="mt-4 p-4 rounded-xl border"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
            borderColor: 'var(--color-border-light)',
          }}
        >
          <p 
            className="text-sm"
            style={{ color: 'var(--color-on-surface)' }}
          >
            <span className="font-medium">Tema seleccionado:</span>{' '}
            <span 
              className="capitalize"
              style={{ color: 'var(--color-primary)' }}
            >
              {selectedThemeId}
            </span>
          </p>
          <p 
            className="text-xs mt-1"
            style={{ color: 'var(--color-on-surface-muted)' }}
          >
            Podés personalizarlo más desde el panel de administración después de
            crear el evento.
          </p>
        </div>
      )}
    </motion.div>
  );
}
