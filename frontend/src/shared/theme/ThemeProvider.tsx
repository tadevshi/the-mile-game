import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/shared/lib/api';

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

interface ThemeContextType {
  theme: Theme;
  isLoading: boolean;
  error: string | null;
  refreshTheme: () => Promise<void>;
}

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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  eventSlug: string;
}

export function ThemeProvider({ children, eventSlug }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTheme = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Theme>(`/events/${eventSlug}/theme`);
      setTheme(response.data);
    } catch (err) {
      console.error('Failed to load theme:', err);
      setError('Failed to load theme');
      // Keep default theme on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventSlug) {
      fetchTheme();
    }
  }, [eventSlug]);

  // Inject CSS custom properties when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--color-bg', theme.bgColor);
    root.style.setProperty('--color-text', theme.textColor);
    root.style.setProperty('--font-display', `'${theme.displayFont}', cursive`);
    root.style.setProperty('--font-heading', `'${theme.headingFont}', serif`);
    root.style.setProperty('--font-body', `'${theme.bodyFont}', sans-serif`);
    
    // Apply background style class to body
    document.body.className = `theme-${theme.backgroundStyle}`;
    
    return () => {
      document.body.className = '';
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading, error, refreshTheme: fetchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeContext };
