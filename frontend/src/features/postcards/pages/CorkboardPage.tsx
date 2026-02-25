import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePostcards } from '../hooks/usePostcards';
import { useQuizStore } from '@features/quiz/store/quizStore';
import { PostcardCard } from '../components/PostcardCard';
import { PostcardModal } from '../components/PostcardModal';
import { AddPostcardSheet } from '../components/AddPostcardSheet';
import { StampLayer } from '../components/StampLayer';
import { GiftBox } from '../components/GiftBox';
import { Button } from '@/shared';
import type { Postcard } from '../types/postcards.types';

// Importar textura de corcho como asset estático
import corkTexture from '@/assets/cartelera.png';

export function CorkboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasCompleted = useQuizStore((s) => s.hasCompleted);
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

  // Auto-abrir el sheet si viene de "Dejar tu Foto para Mile" (WelcomePage)
  useEffect(() => {
    if (searchParams.get('add') === 'true' && hasCompleted) {
      setIsAddOpen(true);
    }
  }, [searchParams, hasCompleted]);

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
    <div className="min-h-screen relative">
      {/* Fondo de corcho — fixed para que no scrollee con el contenido */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${corkTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Viñeta sutil sobre el corcho — también fija */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />

      {/* ── Estampillas decorativas (desktop / proyección) ──────────────────
          z-[2]: detrás de postcards (z-10) y el header, delante del fondo.
          Solo visible en pantallas medianas+. Se ocultan en mobile.          ── */}
      <div className="hidden md:block">
        <StampLayer />
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

      {/* FAB — Agregar postal (solo si completó el quiz) */}
      {hasCompleted && (
        <motion.button
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
      )}

      {/* Botón volver — abajo izquierda */}
      <div className="fixed bottom-6 left-6 z-40">
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
    </div>
  );
}
