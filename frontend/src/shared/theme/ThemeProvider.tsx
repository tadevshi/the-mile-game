import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THEME_PRESETS, type ThemePresetData, getPresetByName } from './presets';
import { useEventStore } from '@/shared/store/eventStore';
import { createTheme, type ThemeData } from './utils/themeFactory';
import { applyCSSVariables } from './utils/cssVariables';

/**
 * Legacy Theme interface (flat structure)
 * Kept for backward compatibility with existing components
 */
export interface Theme {
  id?: string;
  eventId?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  logoPath?: string;
  heroImagePath?: string;
  backgroundStyle: 'watercolor' | 'minimal' | 'dark' | 'party';
}

export interface ThemePreset {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  backgroundStyle: string;
}

/**
 * ThemeContextValue - Interfaz para el contexto de tema
 * Provee acceso al tema actual, función para cambiarlo, y lista de presets disponibles
 */
export interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  setThemeById: (themeId: string) => void;
  availableThemes: ThemePresetData[];
  isLoading: boolean;
  error: string | null;
  refreshTheme: () => Promise<void>;
}

/**
 * Default theme - se usa como fallback
 * Updated with WCAG AA compliant colors
 */
const defaultTheme: Theme = {
  primaryColor: '#D22E7F', // WCAG AA compliant
  secondaryColor: '#FBCFE8',
  accentColor: '#B0236A',
  bgColor: '#FFF5F7',
  textColor: '#1E293B',
  displayFont: 'Great Vibes',
  headingFont: 'Playfair Display',
  bodyFont: 'Montserrat',
  backgroundStyle: 'watercolor',
};

/**
 * LocalStorage key para persistir el tema seleccionado
 */
const THEME_STORAGE_KEY = 'eventhub_selected_theme';

/**
 * Cargar Google Font dinámicamente
 */
function loadGoogleFont(fontName: string): void {
  const fontUrl = fontName.replace(/ /g, '+');
  const linkId = `dynamic-font-${fontUrl}`;
  
  // Skip if already loaded
  if (document.getElementById(linkId)) {
    return;
  }
  
  const link = document.createElement('link');
  link.id = linkId;
  link.href = `https://fonts.googleapis.com/css2?family=${fontUrl}:wght@300;400;500;600;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

/**
 * Cargar todas las Google Fonts del tema
 */
function loadThemeFonts(displayFont: string, headingFont: string, bodyFont: string): void {
  const fonts = [displayFont, headingFont, bodyFont].filter(Boolean);
  
  fonts.forEach(font => {
    if (font) {
      loadGoogleFont(font);
    }
  });
}

/**
 * Obtener tema del localStorage o default
 */
function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Theme;
      // Validar que tenga las propiedades mínimas requeridas
      if (parsed.primaryColor && parsed.bgColor) {
        return { ...defaultTheme, ...parsed };
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored theme:', err);
  }
  return defaultTheme;
}

/**
 * Guardar tema en localStorage
 */
function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch (err) {
    console.warn('Failed to store theme:', err);
  }
}

/**
 * Crear Theme desde un preset
 */
function themeFromPreset(preset: ThemePresetData): Theme {
  return {
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
}

/**
 * Convert legacy Theme to ThemeData for V2 system
 */
function themeToThemeData(theme: Theme): ThemeData {
  return {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    bgColor: theme.bgColor,
    textColor: theme.textColor,
    displayFont: theme.displayFont,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
    backgroundStyle: theme.backgroundStyle,
  };
}

// Create context with undefined as default - must be wrapped by ThemeProvider
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  eventSlug?: string;
  initialTheme?: Theme;
}

/**
 * ThemeProvider - Proveedor de contexto de tema para toda la aplicación
 * 
 * Funcionalidades:
 * - Carga tema desde localStorage (fallback a default)
 * - Aplica CSS custom properties al document root (V2: design tokens completos)
 * - Sincroniza con EventStore para eventos
 * - Provee currentTheme, setTheme, availableThemes
 */
export function ThemeProvider({ 
  children, 
  eventSlug, 
  initialTheme 
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Prioridad: initialTheme > tema del evento > stored > default
    if (initialTheme) return initialTheme;
    
    // Para páginas de evento, el tema del evento tiene prioridad sobre localStorage
    if (eventSlug) {
      const currentEvent = useEventStore.getState().currentEvent;
      if (currentEvent?.themeId) {
        const preset = getPresetByName(currentEvent.themeId);
        if (preset) {
          return themeFromPreset(preset);
        }
      }
    }
    
    return getStoredTheme();
  });
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  /**
   * Función para actualizar el tema y persistir en localStorage
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);
  };

  /**
   * Función para establecer tema por ID de preset
   */
  const setThemeById = (themeId: string) => {
    const preset = getPresetByName(themeId);
    if (preset) {
      setTheme(themeFromPreset(preset));
    }
  };

  /**
   * Efecto: Sincronizar con currentEvent.themeId del store
   */
  useEffect(() => {
    if (!eventSlug) return;

    const applyEventTheme = () => {
      const currentEvent = useEventStore.getState().currentEvent;
      if (currentEvent?.themeId) {
        const preset = getPresetByName(currentEvent.themeId);
        if (preset) {
          setThemeState(themeFromPreset(preset));
          return true;
        }
      }
      return false;
    };

    if (!applyEventTheme()) {
      setThemeState(defaultTheme);
    }

    let prevThemeId = useEventStore.getState().currentEvent?.themeId;
    
    const unsubscribe = useEventStore.subscribe(
      (state) => {
        const currentEvent = state.currentEvent;
        const newThemeId = currentEvent?.themeId;
        if (newThemeId !== prevThemeId) {
          prevThemeId = newThemeId;
          if (newThemeId) {
            const preset = getPresetByName(newThemeId);
            if (preset) {
              setThemeState(themeFromPreset(preset));
            }
          }
        }
      }
    );

    return unsubscribe;
  }, [eventSlug]);

  /**
   * Fetch theme desde backend (si hay eventSlug)
   */
  const refreshTheme = async () => {
    if (!eventSlug) return;
    // El tema se sincroniza automáticamente con currentEvent.themeId
  };

  /**
   * Efecto: Inyectar CSS custom properties cuando el tema cambia
   * 
   * V2: Usa applyCSSVariables() para inyectar TODOS los design tokens
   * (colors, typography, spacing, radius, shadows)
   */
  useEffect(() => {
    // Load Google Fonts dynamically for the theme
    loadThemeFonts(theme.displayFont, theme.headingFont, theme.bodyFont);
    
    // Convert legacy Theme to ThemeData and create complete theme
    const themeData = themeToThemeData(theme);
    const completeTheme = createTheme(themeData);
    
    // Apply all CSS variables (V2 system)
    const cleanup = applyCSSVariables(completeTheme);
    
    return () => {
      cleanup();
    };
  }, [theme]);

  const value: ThemeContextValue = {
    currentTheme: theme,
    setTheme,
    setThemeById,
    availableThemes: THEME_PRESETS,
    isLoading,
    error,
    refreshTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook para consumir el contexto de tema
 * @throws Error si se usa fuera de ThemeProvider
 */
export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeContext };
