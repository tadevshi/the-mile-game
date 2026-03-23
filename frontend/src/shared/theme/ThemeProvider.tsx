import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THEME_PRESETS, type ThemePresetData, getPresetByName } from './presets';
import { useEventStore } from '@/shared/store/eventStore';

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
 */
const defaultTheme: Theme = {
  primaryColor: '#EC4899',
  secondaryColor: '#FBCFE8',
  accentColor: '#DB2777',
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
  // Load fonts that are not the defaults (Great Vibes, Playfair Display, Montserrat)
  const defaultFonts = ['Great Vibes', 'Playfair Display', 'Montserrat'];
  
  if (displayFont && !defaultFonts.includes(displayFont)) {
    loadGoogleFont(displayFont);
  }
  if (headingFont && !defaultFonts.includes(headingFont)) {
    loadGoogleFont(headingFont);
  }
  if (bodyFont && !defaultFonts.includes(bodyFont)) {
    loadGoogleFont(bodyFont);
  }
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
 * - Aplica CSS custom properties al document root
 * - Proveed currentTheme, setTheme, availableThemes
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
   * Esto asegura que cuando EventLoader carga el evento,
   * el tema se actualice automáticamente según el themeId del evento
   * 
   * También se re-ejecuta cuando currentEvent?.themeId cambia para
   * cubrir el caso donde el evento se carga después del mount
   */
  useEffect(() => {
    // Solo sincronizar si hay un eventSlug (estamos en contexto de evento)
    if (!eventSlug) return;

    // Función helper para aplicar el tema del evento si está disponible
    const applyEventTheme = () => {
      const currentEvent = useEventStore.getState().currentEvent;
      if (currentEvent?.themeId) {
        const preset = getPresetByName(currentEvent.themeId);
        if (preset) {
          // Aplicar el tema del preset sin guardarlo en localStorage
          // (el localStorage es solo para preferencias del usuario, no del evento)
          setThemeState(themeFromPreset(preset));
          return true;
        }
      }
      return false;
    };

    // Intentar aplicar inmediatamente (caso: evento ya cargado)
    if (!applyEventTheme()) {
      // Si no hay tema del evento, aplicar default
      setThemeState(defaultTheme);
    }

    // Suscribirse a cambios en el store para detectar cuando el evento se carga
    // Usamos subscribe con selector para solo reaccionar a cambios de themeId
    let prevThemeId = useEventStore.getState().currentEvent?.themeId;
    
    const unsubscribe = useEventStore.subscribe(
      (state) => {
        const currentEvent = state.currentEvent;
        // Solo reaccionar si cambió el themeId
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
    
    // El tema ahora se sincroniza automáticamente con currentEvent.themeId
    // a través de los efectos acima
  };

  /**
   * Efecto: Inyectar CSS custom properties cuando el tema cambia
   */
  useEffect(() => {
    const root = document.documentElement;
    
    // Load Google Fonts dynamically for the theme
    loadThemeFonts(theme.displayFont, theme.headingFont, theme.bodyFont);
    
    // Set primary colors as Tailwind-compatible CSS variables
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--color-bg', theme.bgColor);
    root.style.setProperty('--color-text', theme.textColor);
    
    // Set fonts
    root.style.setProperty('--font-display', `'${theme.displayFont}', cursive`);
    root.style.setProperty('--font-heading', `'${theme.headingFont}', serif`);
    root.style.setProperty('--font-body', `'${theme.bodyFont}', sans-serif`);
    
    // Apply background style class to body
    document.body.className = `theme-${theme.backgroundStyle}`;
    
    // Apply theme colors to Tailwind custom properties for direct use
    // These can be used in Tailwind classes like bg-[var(--color-primary)]
    root.style.setProperty('--tw-primary', theme.primaryColor);
    root.style.setProperty('--tw-secondary', theme.secondaryColor);
    root.style.setProperty('--tw-accent', theme.accentColor);
    
    return () => {
      document.body.className = '';
      // Clean up custom properties on unmount
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-bg');
      root.style.removeProperty('--color-text');
      root.style.removeProperty('--font-display');
      root.style.removeProperty('--font-heading');
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--tw-primary');
      root.style.removeProperty('--tw-secondary');
      root.style.removeProperty('--tw-accent');
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
