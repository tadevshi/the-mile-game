import type { ThemePreset } from '@/shared/theme';

interface ThemePresetGalleryProps {
  presets: ThemePreset[];
  selectedPreset?: string;
  onSelect: (preset: ThemePreset) => void;
}

export function ThemePresetGallery({ presets, selectedPreset, onSelect }: ThemePresetGalleryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {presets.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onSelect(preset)}
          className={`
            relative rounded-xl p-4 border-2 transition-all duration-200
            hover:shadow-lg hover:scale-105
            ${selectedPreset === preset.name 
              ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] ring-opacity-50' 
              : 'border-slate-200 hover:border-[var(--color-primary)]'
            }
          `}
        >
          {/* Color preview */}
          <div 
            className="h-16 rounded-lg mb-3"
            style={{
              background: `linear-gradient(135deg, ${preset.primaryColor} 0%, ${preset.secondaryColor} 100%)`,
            }}
          />
          
          {/* Preset name */}
          <div className="text-sm font-medium capitalize text-slate-700">
            {preset.name}
          </div>
          
          {/* Selected indicator */}
          {selectedPreset === preset.name && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
