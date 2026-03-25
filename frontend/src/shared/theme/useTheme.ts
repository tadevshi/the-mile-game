import { useThemeContext, type ThemeContextValue } from './ThemeProvider';

/**
 * Hook personalizado para consumir el ThemeContext
 * 
 * Provee acceso al tema actual, funciones para cambiarlo,
 * y la lista de temas disponibles.
 * 
 * @example
 * ```tsx
 * const { currentTheme, setThemeById, availableThemes } = useTheme();
 * 
 * // Cambiar a un preset específico
 * setThemeById('ethereal-gala');
 * 
 * // Usar colores del tema
 * <div style={{ backgroundColor: currentTheme.primaryColor }}>
 * ```
 * 
 * @throws Error si se usa fuera de ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useThemeContext();
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

/**
 * Hook para obtener solo el tema actual (para uso simple)
 * 
 * @example
 * ```tsx
 * const theme = useCurrentTheme();
 * return <h1 style={{ color: theme.primaryColor }}>Hola</h1>;
 * ```
 */
export function useCurrentTheme() {
  const { currentTheme } = useThemeContext();
  return currentTheme;
}

/**
 * Hook para verificar si un preset específico está activo
 * 
 * @example
 * ```tsx
 * const isEtherealGala = useIsThemeActive('ethereal-gala');
 * ```
 */
export function useIsThemeActive(themeId: string): boolean {
  const { currentTheme } = useThemeContext();
  
  // Comparamos contra los presets disponibles
  const { availableThemes } = useThemeContext();
  const preset = availableThemes.find(p => p.name === themeId);
  
  if (!preset) return false;
  
  return (
    currentTheme.primaryColor === preset.primaryColor &&
    currentTheme.bgColor === preset.bgColor
  );
}
