import { motion, AnimatePresence } from 'framer-motion';
import { useAutoPWAInstall } from '@/shared/hooks/usePWAInstall';

/**
 * Banner que aparece en mobile prompting "Add to Home Screen".
 * Se muestra automáticamente después de 30 segundos (via useAutoPWAInstall).
 */
export function InstallPromptBanner() {
  const { isInstallable, isInstalled } = useAutoPWAInstall();

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
        <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-pink-100">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-2xl flex-shrink-0">
            📱
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">
              Instalar EventHub
            </p>
            <p className="text-xs text-gray-500 truncate">
              Agregá la app a tu pantalla de inicio
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
