import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { PushPin } from './PushPin';
import type { Postcard } from '../types/postcards.types';

interface PostcardModalProps {
  postcard: Postcard | null;
  onClose: () => void;
}

export function PostcardModal({ postcard, onClose }: PostcardModalProps) {
  const postcardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!postcardRef.current || !postcard) return;

    try {
      const dataUrl = await toPng(postcardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `postal-${postcard.player_name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading postcard:', err);
    }
  };

  return (
    <AnimatePresence>
      {postcard && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Contenido */}
          <motion.div
            className="relative z-10 w-full max-w-md md:max-w-2xl"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Pin centrado — z-30 siempre encima de la postal */}
            <div className="flex justify-center mb-[-8px] relative z-30 pointer-events-none">
              <PushPin className="scale-125" />
            </div>

            {/* Postal expandida — esquinas rectas como postal real */}
            <div
              ref={postcardRef}
              className="bg-white shadow-2xl overflow-hidden border border-gray-200"
            >
              {/* Mobile: vertical (foto arriba, mensaje abajo) */}
              {/* Desktop: horizontal (foto izquierda, mensaje derecha) — mismo formato que la card */}
              <div className="flex flex-col md:flex-row">
                {/* Foto — sin absolute, sin object-cover: la imagen se muestra completa */}
                <div className="md:w-1/2 overflow-hidden bg-gray-100">
                  <img
                    src={postcard.image_path}
                    alt={`Postal de ${postcard.player_name}`}
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>

                {/* Separador */}
                <div className="h-px md:h-auto md:w-px bg-gray-200" />

                {/* Mensaje */}
                <div className="md:w-1/2 p-6 flex flex-col justify-between relative min-h-[200px]">
                  {/* Líneas decorativas */}
                  <div className="absolute inset-x-5 top-12 space-y-5 pointer-events-none">
                    <div className="h-px bg-gray-100" />
                    <div className="h-px bg-gray-100" />
                    <div className="h-px bg-gray-100" />
                    <div className="h-px bg-gray-100" />
                  </div>

                  <div className="relative z-10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
                      mensaje:
                    </p>
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif italic whitespace-pre-wrap">
                      {postcard.message || '...'}
                    </p>
                  </div>

                  {/* From */}
                  <div className="relative z-10 mt-4 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="text-xl">{postcard.player_avatar}</span>
                      <span className="font-semibold text-accent">
                        {postcard.player_name}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones debajo de la postal */}
            <div className="flex justify-center gap-3 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 shadow-lg border border-gray-200 flex items-center gap-2 cursor-pointer"
              >
                <span>📥</span> Descargar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 shadow-lg border border-gray-200 cursor-pointer"
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
