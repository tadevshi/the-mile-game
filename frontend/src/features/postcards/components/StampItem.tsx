import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface StampPosition {
  top: string;
  left?: string;
  right?: string;
  rotation: number;
  /** Hacia dónde se expande el post-it al abrir (depende del lado de la pantalla) */
  expandDirection: 'right' | 'left';
}

interface StampItemProps {
  image: string;
  description: string;
  position: StampPosition;
  index: number;
}

export function StampItem({ image, description, position, index }: StampItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const transformOrigin =
    position.expandDirection === 'right' ? 'top left' : 'top right';

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        right: position.right,
        zIndex: isOpen ? 50 : 2,
        transformOrigin,
        cursor: isOpen ? 'default' : 'pointer',
        width: isOpen ? 220 : 75,
      }}
      animate={isOpen ? 'open' : 'closed'}
      variants={{
        closed: {
          rotate: position.rotation,
          width: 75,
          filter: 'brightness(0.95)',
          transition: { type: 'spring', stiffness: 260, damping: 24 },
        },
        open: {
          rotate: 0,
          width: 220,
          filter: 'brightness(1)',
          transition: { type: 'spring', stiffness: 260, damping: 24 },
        },
      }}
      // Entry animation: aparece con stagger según índice
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
    >
      {/* Hover sutil + click para abrir cuando está cerrado */}
      {!isOpen && (
        <motion.div
          whileHover={{ scale: 1.06, filter: 'brightness(1.08)' }}
          transition={{ duration: 0.2 }}
          className="w-full"
          onClick={() => setIsOpen(true)}
        >
          <img
            src={image}
            alt="Estampilla"
            className="w-full h-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
        </motion.div>
      )}

      {/* Post-it cuando está abierto */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="postit"
            className="relative w-full rounded-sm shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
              borderTop: '28px solid #fde047',
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* Encabezado del post-it */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700/70 font-sans">
                ✍️ &ldquo;Así me describieron&rdquo;
              </p>
            </div>

            {/* Texto de la descripción */}
            <div className="px-4 pb-4 pt-1">
              <p
                className="text-gray-800 leading-snug"
                style={{
                  fontFamily: "'Great Vibes', cursive",
                  fontSize: '1.25rem',
                  lineHeight: '1.5',
                }}
              >
                &ldquo;{description}&rdquo;
              </p>
            </div>

            {/* Esquina doblada (efecto CSS) */}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
              style={{
                background:
                  'linear-gradient(225deg, #d97706 50%, transparent 50%)',
                opacity: 0.35,
              }}
            />

            {/* Botón cerrar */}
            <motion.button
              className="absolute top-1 right-2 text-yellow-700/60 hover:text-yellow-900 text-lg leading-none font-bold"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Cerrar post-it"
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
