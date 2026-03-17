import { useState, useEffect, useCallback, useRef } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePostcards } from '../hooks/usePostcards';
import { PostcardCard } from '../components/PostcardCard';
import { PostcardModal } from '../components/PostcardModal';
import { AddPostcardSheet } from '../components/AddPostcardSheet';
import { StampLayer } from '../components/StampLayer';
import { GiftBox } from '../components/GiftBox';
import { Button } from '@/shared';
import { useCorkboardCapture } from '../hooks/useCorkboardCapture';
import type { Postcard } from '../types/postcards.types';

// Importar textura de corcho como asset estático
import corkTexture from '@/assets/cartelera.png';

export function CorkboardPage() {
  const navigate = useEventNavigate();
  const [searchParams] = useSearchParams();
  const {
    postcards,
    isLoading,
    error,
    isRevealing,
    revealedPostcards,
    createPostcard,
    addRevealedPostcards,
  } = usePostcards();

  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const corkboardRef = useRef<HTMLDivElement>(null);
  const { isFlashing, isCapturing, captureError, downloadCorkboard } = useCorkboardCapture(corkboardRef);

  // Auto-abrir el sheet si viene de "Dejar tu Foto para Mile" (WelcomePage)
  // Funciona tanto para jugadores registrados como para invitados
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddOpen(true);
    }
  }, [searchParams]);

  const handleAddPostcard = async (image: File, message: string, senderName?: string) => {
    await createPostcard(image, message, senderName);
  };

  // When gift box animation finishes, merge revealed postcards into board
  const handleRevealComplete = useCallback((revealed: Postcard[]) => {
    addRevealedPostcards(revealed);
    // Auto-open first revealed postcard in modal after a short delay
    if (revealed.length > 0) {
      setTimeout(() => setSelectedPostcard(revealed[0]), 1000);
    }
  }, [addRevealedPostcards]);

  return (
    <div ref={corkboardRef} className="min-h-screen relative">
      {/* Fondo de corcho — fixed para que no scrollee con el contenido */}
      <div
        data-cork-bg="true"
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${corkTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Viñeta sutil sobre el corcho — también fija */}
      <div
        data-cork-vignette="true"
        className="fixed inset-0 -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]"
      />

      {/* ── Estampillas decorativas (desktop / proyección) ──────────────────
          z-[2]: detrás de postcards (z-10) y el header, delante del fondo.
          Solo visible en pantallas medianas+. Se ocultan en mobile.          ── */}
      <div className="hidden md:block">
        <StampLayer />
      </div>

      {/* Botón guardar recuerdo — arriba a la derecha */}
      <div data-export-hide="true" className="fixed top-4 right-4 z-40">
        <motion.button
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 text-sm font-medium shadow-lg border border-gray-200 cursor-pointer disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={downloadCorkboard}
          disabled={isCapturing}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          aria-label="Guardar recuerdo"
        >
          📷 Guardar recuerdo
        </motion.button>

        {/* Error toast visible */}
        <AnimatePresence>
          {captureError && (
            <motion.p
              className="mt-2 px-3 py-2 rounded-lg bg-red-500/90 text-white text-xs text-center shadow-lg max-w-[200px]"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              No se pudo capturar 😕
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-6 pb-4 px-4 text-center pointer-events-none">
        <motion.h1
          className="text-4xl md:text-5xl font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Cartelera de Postales
        </motion.h1>
        <motion.p
          className="text-sm text-white/80 mt-1 font-light drop-shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Dejá tu mensaje para Mile
        </motion.p>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 px-4 pb-28 pointer-events-none">
        {/* Estado: cargando */}
        {isLoading && postcards.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <motion.div
              className="text-4xl"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              📌
            </motion.div>
          </div>
        )}

        {/* Estado: error */}
        {error && (
          <div className="text-center py-10">
            <p className="text-white/80 bg-black/30 inline-block px-4 py-2 rounded-xl text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Estado: vacío */}
        {!isLoading && !error && postcards.length === 0 && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-5xl mb-4">📌</p>
            <p className="text-white/90 font-serif text-lg drop-shadow-sm">
              La cartelera está vacía...
            </p>
            <p className="text-white/70 text-sm mt-1">
              ¡Sé el primero en dejar una postal!
            </p>
          </motion.div>
        )}

        {/* Grid de postales — Desktop: masonry desordenado, Mobile: columna */}
        {postcards.length > 0 && (
          <div className="
            grid gap-6 
            grid-cols-1 
            md:grid-cols-2 
            lg:grid-cols-3 
            xl:grid-cols-4
            max-w-7xl mx-auto
          ">
            {postcards.map((postcard, index) => (
              <motion.div
                key={postcard.id}
                // Offset vertical aleatorio en desktop para dar efecto desordenado
                className="md:first:mt-0 pointer-events-auto"
                style={{
                  marginTop: typeof window !== 'undefined' && window.innerWidth >= 768
                    ? `${((index * 37) % 40) - 10}px`
                    : undefined,
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
              >
                <PostcardCard
                  postcard={postcard}
                  onSelect={setSelectedPostcard}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Agregar postal (visible para todos, con o sin quiz) */}
      <motion.button
        data-export-hide="true"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-xl shadow-accent/30 flex items-center justify-center text-2xl cursor-pointer border-2 border-white/20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAddOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
        aria-label="Agregar postal"
      >
        📸
      </motion.button>

      {/* Botón volver — abajo izquierda */}
      <div data-export-hide="true" className="fixed bottom-6 left-6 z-40">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="!bg-white/90 backdrop-blur-sm !border-gray-300 !text-gray-700 !shadow-lg"
          >
            ← Volver
          </Button>
        </motion.div>
      </div>

      {/* Modal de postal expandida */}
      <PostcardModal
        postcard={selectedPostcard}
        onClose={() => setSelectedPostcard(null)}
      />

      {/* Sheet para agregar postal */}
      <AddPostcardSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddPostcard}
      />

      {/* 🎁 Secret Box reveal animation overlay */}
      {isRevealing && revealedPostcards.length > 0 && (
        <GiftBox
          postcards={revealedPostcards}
          onRevealComplete={handleRevealComplete}
        />
      )}

      {/* 📷 Flash overlay — efecto cámara al guardar recuerdo */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            className="camera-flash-overlay fixed inset-0 z-[100] pointer-events-none bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
