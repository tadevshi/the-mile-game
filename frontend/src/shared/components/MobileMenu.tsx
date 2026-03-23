import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Hook personalizado para detectar breakpoint mobile
 * Retorna true si el viewport es menor a md (768px)
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check inicial
    checkMobile();

    // Listener para cambios de tamaño
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Menú desplegable para mobile que contiene:
 * - Selector de idioma
 * - Toggle de tema (dark/light)
 * 
 * En desktop (>= md): retorna null (los toggles se muestran directamente)
 * En mobile (< md): muestra botón hamburguesa con dropdown
 */
export function MobileMenu() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar dropdown al cambiar a desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  // Si no es mobile, retornar null para que App.tsx muestre los toggles directamente
  if (!isMobile) {
    return null;
  }

  return (
    <div ref={menuRef} className="fixed top-4 right-4 z-50">
      {/* Botón hamburguesa */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
        className="
          w-10 h-10 rounded-full
          flex items-center justify-center
          text-accent dark:text-primary
          bg-white/70 dark:bg-slate-800/70
          backdrop-blur-md
          border border-pink-100 dark:border-slate-600
          shadow-md shadow-pink-100/50 dark:shadow-slate-900/50
          cursor-pointer
        "
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOpen ? 'close' : 'menu'}
            initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 30, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="
              absolute top-12 right-0
              w-48
              bg-white/90 dark:bg-slate-800/90
              backdrop-blur-md
              border border-pink-100 dark:border-slate-600
              rounded-2xl
              shadow-lg shadow-pink-100/50 dark:shadow-slate-900/50
              p-3
              space-y-3
            "
          >
            {/* Language Switcher */}
            <div className="flex justify-center">
              <LanguageSwitcher />
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-pink-100 dark:bg-slate-600" />

            {/* Theme Toggle - versión inline para el dropdown */}
            <div className="flex justify-center">
              <ThemeToggleInline />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ThemeToggle versión inline para usar dentro del dropdown
 * Sin posición fixed, se adapta al contexto del dropdown
 */
function ThemeToggleInline() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className="
        w-10 h-10 rounded-full
        flex items-center justify-center
        text-accent dark:text-primary
        bg-pink-50 dark:bg-slate-700
        border border-pink-100 dark:border-slate-600
        cursor-pointer
        transition-colors duration-300
      "
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
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

// Imports inline de los iconos
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
