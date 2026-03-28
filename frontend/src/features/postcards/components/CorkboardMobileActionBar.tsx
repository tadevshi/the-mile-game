import { Home, Camera, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface CorkboardMobileActionBarProps {
  onGoHome: () => void;
  onAddPostcard: () => void;
  onSaveSnapshot: () => void;
  isSaving?: boolean;
}

export function CorkboardMobileActionBar({
  onGoHome,
  onAddPostcard,
  onSaveSnapshot,
  isSaving = false,
}: CorkboardMobileActionBarProps) {
  return (
    <div
      data-export-hide="true"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-[var(--color-surface)]/95 backdrop-blur-md md:hidden"
      style={{
        borderColor: 'var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <div className="grid grid-cols-3 gap-2 px-3 py-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onGoHome}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[var(--color-on-surface)] cursor-pointer"
          type="button"
        >
          <Home size={20} />
          <span className="text-[11px] font-medium">Inicio</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onAddPostcard}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-white cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary)' }}
          type="button"
        >
          <Camera size={20} />
          <span className="text-[11px] font-semibold">Agregar</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: isSaving ? 1 : 0.96 }}
          onClick={onSaveSnapshot}
          disabled={isSaving}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 cursor-pointer disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-secondary-light)',
            color: 'var(--color-on-surface)',
            border: '1px solid var(--color-border)',
          }}
          type="button"
        >
          <Download size={20} />
          <span className="text-[11px] font-medium">Guardar</span>
        </motion.button>
      </div>
    </div>
  );
}
