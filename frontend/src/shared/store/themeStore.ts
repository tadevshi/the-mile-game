import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

/** Aplica/quita la clase `dark` en <html> — fuente de verdad para Tailwind. */
function applyThemeClass(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      // Por defecto SIEMPRE modo claro, sin importar la preferencia del sistema.
      theme: 'light',

      toggleTheme: () =>
        set((state) => {
          const next: Theme = state.theme === 'light' ? 'dark' : 'light';
          applyThemeClass(next);
          return { theme: next };
        }),
    }),
    {
      name: 'mile-theme',
      // Al rehidratar desde localStorage, aplicamos la clase de inmediato
      // para evitar flash de tema incorrecto en usuarios que ya eligieron dark.
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme);
      },
    },
  ),
);
