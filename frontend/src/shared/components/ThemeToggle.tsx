import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';

/** Ícono Sol */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      />
    </svg>
  );
}

/** Ícono Luna */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Botón flotante fixed para cambiar entre light/dark mode.
 * Aparece en todas las páginas sin necesidad de añadirlo en cada una.
 * Persiste la preferencia en localStorage via themeStore.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className="
        fixed top-14 right-4 z-[60]
        w-10 h-10 rounded-full
        flex items-center justify-center
        text-accent dark:text-primary
        bg-white/70 dark:bg-slate-800/70
        backdrop-blur-md
        border border-pink-100 dark:border-slate-600
        shadow-md shadow-pink-100/50 dark:shadow-slate-900/50
        cursor-pointer
        transition-colors duration-300
      "
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* AnimatePresence hace fade entre sol y luna sin resize del botón */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.6 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
