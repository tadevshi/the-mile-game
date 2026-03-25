import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/shared/hooks/usePWAInstall';

/**
 * Banner que aparece en mobile prompting "Add to Home Screen".
 * Se muestra automáticamente después de 30 segundos (via useAutoPWAInstall).
 */
export function InstallPromptBanner() {
  const { isInstallable, isInstalled, dismiss } = usePWAInstall();

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:hidden"
      >
        <div 
          className="rounded-[var(--radius-lg)] shadow-2xl p-4 flex items-center gap-3 border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border-light)',
          }}
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)' }}
          >
            📱
          </div>
          
          <div className="flex-1 min-w-0">
            <p 
              className="font-semibold text-sm"
              style={{ color: 'var(--color-on-surface)' }}
            >
              Instalar EventHub
            </p>
            <p 
              className="text-xs truncate"
              style={{ color: 'var(--color-on-surface-muted)' }}
            >
              Agregá la app a tu pantalla de inicio
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={dismiss}
            className="p-1 rounded-full hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Cerrar banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
