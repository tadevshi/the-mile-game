import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Theme, ThemePreset } from '@/shared/theme';

interface UseThemeEditorReturn {
  theme: Theme | null;
  presets: ThemePreset[];
  isLoading: boolean;
  error: string | null;
  updateTheme: (updates: Partial<Theme>) => Promise<void>;
  applyPreset: (presetName: string) => Promise<void>;
  refreshTheme: () => Promise<void>;
}

export function useThemeEditor(eventId: string): UseThemeEditorReturn {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current theme
  const fetchTheme = useCallback(async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get event slug first
      const eventResponse = await api.get(`/events/${eventId}`);
      const eventSlug = eventResponse.data.slug;

      // Then get theme
      const themeResponse = await api.get<Theme>(`/events/${eventSlug}/theme`);
      setTheme(themeResponse.data);
    } catch (err) {
      console.error('Failed to load theme:', err);
      setError('Failed to load theme');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Fetch presets
  const fetchPresets = useCallback(async () => {
    try {
      const response = await api.get<{ presets: ThemePreset[] }>('/themes/presets');
      setPresets(response.data.presets);
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTheme();
    fetchPresets();
  }, [fetchTheme, fetchPresets]);

  // Update theme
  const updateTheme = async (updates: Partial<Theme>) => {
    if (!eventId) throw new Error('No event ID');

    try {
      const response = await api.put<{ theme: Theme }>(
        `/admin/events/${eventId}/theme`,
        updates
      );
      setTheme(response.data.theme);
    } catch (err) {
      console.error('Failed to update theme:', err);
      throw err;
    }
  };

  // Apply preset
  const applyPreset = async (presetName: string) => {
    if (!eventId) throw new Error('No event ID');

    try {
      const response = await api.post<{ theme: Theme }>(
        `/admin/events/${eventId}/theme/preset`,
        { preset: presetName }
      );
      setTheme(response.data.theme);
    } catch (err) {
      console.error('Failed to apply preset:', err);
      throw err;
    }
  };

  return {
    theme,
    presets,
    isLoading,
    error,
    updateTheme,
    applyPreset,
    refreshTheme: fetchTheme,
  };
}
