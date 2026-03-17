import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '@/shared/components/PageLayout';
import { Button } from '@/shared/components/Button';
import { useThemeEditor } from '../hooks/useThemeEditor';
import { ThemePresetGallery } from '../components/ThemePresetGallery';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { ThemeFontSelector } from '../components/ThemeFontSelector';
import { api } from '@/shared/lib/api';
import type { Theme, ThemePreset } from '@/shared/theme';

export function ThemeEditorPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { theme, presets, isLoading, error, updateTheme, applyPreset, refreshTheme } = useThemeEditor(eventId || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Track local changes
  const [localTheme, setLocalTheme] = useState<Partial<Theme>>({});

  useEffect(() => {
    if (theme) {
      setLocalTheme(theme);
    }
  }, [theme]);

  const handleColorChange = (field: keyof Theme, value: string) => {
    setLocalTheme(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleFontChange = (field: keyof Theme, value: string) => {
    setLocalTheme(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handlePresetSelect = async (preset: ThemePreset) => {
    try {
      await applyPreset(preset.name);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError('Failed to apply preset');
    }
  };

  const handleSave = async () => {
    if (!eventId || !hasChanges) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateTheme(localTheme);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError('Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Theme Editor">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-slate-500">Loading theme...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Theme Editor">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">Error: {error}</div>
        </div>
      </PageLayout>
    );
  }

  const currentTheme = { ...theme, ...localTheme } as Theme;

  return (
    <PageLayout title="Theme Editor">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-[var(--color-primary)]">
              Customize Theme
            </h1>
            <p className="text-slate-500 mt-1">
              Personalize the look and feel of your event
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-green-600 text-sm">✓ Saved successfully!</span>
            )}
            {saveError && (
              <span className="text-red-600 text-sm">✗ {saveError}</span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={hasChanges ? 'animate-pulse' : ''}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Preset Gallery */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-heading mb-4">Quick Start: Choose a Preset</h2>
          <ThemePresetGallery
            presets={presets}
            selectedPreset={currentTheme?.backgroundStyle}
            onSelect={handlePresetSelect}
          />
        </section>

        {/* Colors */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-heading mb-4">Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ThemeColorPicker
              label="Primary Color"
              value={currentTheme?.primaryColor || '#EC4899'}
              onChange={(value) => handleColorChange('primaryColor', value)}
            />
            <ThemeColorPicker
              label="Secondary Color"
              value={currentTheme?.secondaryColor || '#FBCFE8'}
              onChange={(value) => handleColorChange('secondaryColor', value)}
            />
            <ThemeColorPicker
              label="Accent Color"
              value={currentTheme?.accentColor || '#DB2777'}
              onChange={(value) => handleColorChange('accentColor', value)}
            />
            <ThemeColorPicker
              label="Background Color"
              value={currentTheme?.bgColor || '#FFF5F7'}
              onChange={(value) => handleColorChange('bgColor', value)}
            />
            <ThemeColorPicker
              label="Text Color"
              value={currentTheme?.textColor || '#1E293B'}
              onChange={(value) => handleColorChange('textColor', value)}
            />
          </div>
        </section>

        {/* Typography */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-heading mb-4">Typography</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ThemeFontSelector
              label="Display Font (Titles)"
              value={currentTheme?.displayFont || 'Great Vibes'}
              onChange={(value) => handleFontChange('displayFont', value)}
              previewText="Happy Birthday!"
            />
            <ThemeFontSelector
              label="Heading Font (Subtitles)"
              value={currentTheme?.headingFont || 'Playfair Display'}
              onChange={(value) => handleFontChange('headingFont', value)}
              previewText="Welcome to the Party"
            />
            <ThemeFontSelector
              label="Body Font (Text)"
              value={currentTheme?.bodyFont || 'Montserrat'}
              onChange={(value) => handleFontChange('bodyFont', value)}
              previewText="Join us for a magical celebration"
            />
          </div>
        </section>

        {/* Live Preview */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-heading mb-4">Live Preview</h2>
          <div 
            className="rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center text-center transition-all duration-300"
            style={{
              backgroundColor: currentTheme?.bgColor,
              color: currentTheme?.textColor,
            }}
          >
            <h3 
              className="text-4xl mb-2"
              style={{ fontFamily: `'${currentTheme?.displayFont}', cursive` }}
            >
              Happy Birthday!
            </h3>
            <h4 
              className="text-xl mb-4"
              style={{ fontFamily: `'${currentTheme?.headingFont}', serif` }}
            >
              You're Invited
            </h4>
            <p style={{ fontFamily: `'${currentTheme?.bodyFont}', sans-serif` }}>
              Join us for a magical celebration
            </p>
            <div className="flex gap-4 mt-6">
              <button
                className="px-6 py-2 rounded-full text-white"
                style={{ backgroundColor: currentTheme?.primaryColor }}
              >
                Primary Button
              </button>
              <button
                className="px-6 py-2 rounded-full"
                style={{ 
                  backgroundColor: currentTheme?.secondaryColor,
                  color: currentTheme?.textColor 
                }}
              >
                Secondary
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
