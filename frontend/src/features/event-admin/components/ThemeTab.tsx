import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, Check, Eye, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/Button';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { api } from '@/shared/lib/api';
import { THEME_PRESETS, type ThemePresetData } from '@/shared/theme';
import type { PreviewTheme } from '@/themes';

interface ThemeTabProps {
  slug: string;
  onPreview?: (theme: PreviewTheme) => void;
  onSave?: (themeName: string) => void;
  previewTheme?: PreviewTheme;
}

export function ThemeTab({ slug, onPreview, onSave, previewTheme }: ThemeTabProps) {
  const { event, refetchEvent } = useEventAdmin(slug);
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);

  // Use preview theme colors or fallbacks
  const theme = previewTheme || {
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accentColor: '#DB2777',
    bgColor: '#FFF5F7',
    textColor: '#1E293B',
    backgroundStyle: 'watercolor',
  };
  const isDarkTheme = theme.backgroundStyle === 'dark';
  const secondaryButtonBg = isDarkTheme ? 'rgba(15, 23, 42, 0.92)' : theme.secondaryColor;
  const secondaryButtonText = isDarkTheme ? theme.textColor : (theme.accentColor || theme.primaryColor);
  const secondaryButtonBorder = isDarkTheme ? 'rgba(103, 232, 249, 0.35)' : `${theme.primaryColor}30`;

  // Get current theme from event settings (backend stores preset name in settings.theme)
  const currentThemeId = event?.settings?.theme || null;

  // Map theme_id to preset name (theme_id equals the preset key like "princess", "elegant", etc.)
  const getPresetByThemeId = (themeId: string | null | undefined): string | null => {
    if (!themeId) return null;
    // Check if theme_id matches any preset name
    const presetExists = THEME_PRESETS.some(p => p.name === themeId);
    if (presetExists) {
      return themeId;
    }
    return null;
  };

  const handlePresetClick = (preset: ThemePresetData) => {
    if (isApplying) return;
    
    setSelectedPreset(preset.name);
    setPreviewing(true);
    
    // Create preview theme from preset
    const previewThemeData: PreviewTheme = {
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      bgColor: preset.bgColor,
      textColor: preset.textColor,
      displayFont: preset.displayFont,
      headingFont: preset.headingFont,
      bodyFont: preset.bodyFont,
      backgroundStyle: preset.backgroundStyle,
    };
    
    // Trigger preview callback
    if (onPreview) {
      onPreview(previewThemeData);
    }
  };

  const handleSavePreset = async (preset: ThemePresetData) => {
    if (isApplying) return;
    
    setIsApplying(true);
    setPreviewing(false);
    
    try {
      // Apply the preset via API
      await api.post(`/admin/events/${slug}/theme/preset`, { preset: preset.name });
      // Refetch event to update theme_id
      await refetchEvent();
      
      // Trigger save callback
      if (onSave) {
        onSave(preset.name);
      }
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display mb-1" style={{ color: theme.textColor }}>Tema Visual</h2>
        <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
          Personalizá los colores y tipografías de tu evento
        </p>
      </div>

      {/* Active Theme Indicator */}
      {event?.settings?.theme && (
        <div 
          className="p-3 rounded-xl flex items-center gap-3"
          style={{ 
            backgroundColor: `${theme.primaryColor}15`,
            border: `1px solid ${theme.primaryColor}30`
          }}
        >
          <div 
            className="w-8 h-8 rounded-full flex-shrink-0" 
            style={{ backgroundColor: theme.primaryColor }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: theme.textColor }}>
              Tema activo
            </p>
            <p className="text-xs" style={{ color: `${theme.textColor}80` }}>
              {event.settings.theme}
            </p>
          </div>
        </div>
      )}

      {/* Preview message */}
      {previewing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl flex items-center gap-2"
          style={{ 
            backgroundColor: `${theme.primaryColor}15`,
            border: `1px solid ${theme.primaryColor}30`
          }}
        >
          <Eye className="w-4 h-4" style={{ color: theme.primaryColor }} />
          <p className="text-sm" style={{ color: theme.textColor }}>
            Vista previa activa. Los colores se aplican automáticamente.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {THEME_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.name || getPresetByThemeId(currentThemeId) === preset.name;
          return (
            <motion.button
              key={preset.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePresetClick(preset)}
              disabled={isApplying}
              className={`h-24 rounded-xl flex items-center justify-center relative cursor-pointer transition-all ${
                isApplying ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isSelected 
                  ? 'ring-4 ring-white ring-offset-2 shadow-xl' 
                  : 'hover:shadow-lg'
              }`}
              style={{ 
                background: `linear-gradient(135deg, ${preset.primaryColor} 0%, ${preset.secondaryColor} 100%)`
              }}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4" style={{ color: preset.primaryColor }} />
                </motion.div>
              )}
              <span className="text-white font-medium text-sm drop-shadow">
                {preset.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Save button - shows after selecting a preset */}
      {selectedPreset && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              const preset = THEME_PRESETS.find(p => p.name === selectedPreset);
              if (preset) handleSavePreset(preset);
            }}
            isLoading={isApplying}
            icon={<Save className="w-4 h-4" />}
            style={{ 
              backgroundColor: theme.primaryColor,
              boxShadow: `0 4px 14px ${theme.primaryColor}30`
            }}
          >
            Guardar Tema
          </Button>

          <Link to={`/admin/${slug}/theme`} className="block">
            <Button
              variant="primary"
              fullWidth
              icon={<Palette className="w-4 h-4" />}
              style={{ 
                backgroundColor: secondaryButtonBg,
                color: secondaryButtonText,
                border: `1px solid ${secondaryButtonBorder}`
              }}
            >
              Personalizar Tema
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Show customizer link even if no preset selected */}
      {!selectedPreset && (
        <Link to={`/admin/${slug}/theme`} className="block">
          <Button
            variant="primary"
            fullWidth
            icon={<Palette className="w-4 h-4" />}
            style={{ 
              backgroundColor: secondaryButtonBg,
              color: secondaryButtonText,
              border: `1px solid ${secondaryButtonBorder}`
            }}
          >
            Personalizar Tema
          </Button>
        </Link>
      )}

      <div 
        className="rounded-xl p-4 text-sm"
        style={{ 
          backgroundColor: `${theme.secondaryColor}30`,
          border: `1px solid ${theme.secondaryColor}50`,
          color: theme.textColor
        }}
      >
        <p className="font-medium mb-1">💡 Consejo</p>
        <p style={{ color: `${theme.textColor}80` }}>
          Hacé click en un preset para ver la vista previa instantlyáneamente, o usá el
          editor visual para personalizar colores y tipografías.
        </p>
      </div>
    </div>
  );
}
