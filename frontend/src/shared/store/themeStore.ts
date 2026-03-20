import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  _hasHydrated: boolean;
}

/** Aplica/quita la clase `dark` en <html> — fuente de verdad para Tailwind. */
function applyThemeClass(theme: Theme) {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      // Por defecto SIEMPRE modo claro, sin importar la preferencia del sistema.
      theme: 'light',
      _hasHydrated: false,

      toggleTheme: () =>
        set((state) => {
          const next: Theme = state.theme === 'light' ? 'dark' : 'light';
          applyThemeClass(next);
          return { theme: next };
        }),

      setTheme: (theme: Theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
    }),
    {
      name: 'mile-theme',
      // Al rehidratar desde localStorage, aplicamos la clase de inmediato
      // para evitar flash de tema incorrecto en usuarios que ya eligieron dark.
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Aplicar tema guardado inmediatamente
          applyThemeClass(state.theme);
          // Marcar como hidratado
          state._hasHydrated = true;
        }
      },
      // Solo guardar theme, no _hasHydrated
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);

// Hook para saber si el store ya está hidratado (útil para evitar flashes)
export function useThemeHydrated(): boolean {
  return useThemeStore((state) => state._hasHydrated);
}
