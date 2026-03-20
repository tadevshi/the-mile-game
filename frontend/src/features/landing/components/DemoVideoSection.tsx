import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DemoVideoSection - YouTube embed with play button overlay.
 * Lazy-loads the iframe only when the user clicks play.
 * 
 * Design: Thumbnail + centered play button, clicking opens a modal.
 * No autoplay per spec requirement.
 */
export function DemoVideoSection() {
  const [showModal, setShowModal] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Placeholder video ID - replace with actual EventHub demo video
  const videoId = 'dQw4w9WgXcQ';
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const handlePlayClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="inline-block px-4 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-sm font-medium rounded-full mb-4">
              Demo
            </span>
            <h2 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
              Vívelo en acción
            </h2>
            <p style={{ color: 'var(--on-surface-variant)' }}>
              Mirá cómo funciona EventHub en un evento real
            </p>
          </motion.div>

          {/* Video Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl overflow-hidden shadow-xl cursor-pointer group"
            style={{ aspectRatio: '16/9', maxHeight: '480px' }}
            onClick={handlePlayClick}
            ref={overlayRef}
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="EventHub Demo Video"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40" />

            {/* Play button */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'var(--primary)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-3xl text-white ml-1">▶</span>
              </motion.div>
            </motion.div>

            {/* Label */}
            <div className="absolute bottom-4 left-4">
              <span className="text-white/80 text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                ▶ Ver demo de EventHub
              </span>
            </div>
          </motion.div>

          {/* Supporting text */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm mt-4"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Duración: ~2 minutos
          </motion.p>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
            />

            {/* Modal content */}
            <motion.div
              className="relative w-full max-w-4xl"
              style={{ aspectRatio: '16/9' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Close button */}
              <button
                onClick={handleCloseModal}
                className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors p-2"
                aria-label="Cerrar video"
              >
                <span className="text-2xl">✕</span>
              </button>

              {/* Iframe */}
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="EventHub Demo"
                className="w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
