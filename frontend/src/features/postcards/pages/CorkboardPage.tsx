import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import emptyAnimation from '@/assets/animations/empty.json';
import { Button, LottieAnimation } from '@/shared';
import { api } from '@/shared/lib/api';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { useEventStore } from '@/shared/store/eventStore';
import { useTheme } from '@/shared/theme/useTheme';
import { AddPostcardSheet } from '../components/AddPostcardSheet';
import { CorkboardMobileActionBar } from '../components/CorkboardMobileActionBar';
import { GiftBox } from '../components/GiftBox';
import { PostcardCard } from '../components/PostcardCard';
import { PostcardModal } from '../components/PostcardModal';
import { StampLayer } from '../components/StampLayer';
import { useCorkboardCapture } from '../hooks/useCorkboardCapture';
import { usePostcards } from '../hooks/usePostcards';
import type { Postcard } from '../types/postcards.types';

export function CorkboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useEventNavigate();
  const [searchParams] = useSearchParams();
  const { currentTheme: theme } = useTheme();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const {
    postcards,
    isLoading,
    error,
    isRevealing,
    revealedPostcards,
    createPostcard,
    addRevealedPostcards,
  } = usePostcards(slug);
  
  // Theme colors for dynamic styling
  const primaryColor = theme.primaryColor;
  const textColor = theme.textColor;
  
  const eventLogoUrl = currentEvent?.settings?.logo_url;
  const backgroundUrl = currentEvent?.settings?.background_url;

  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hasRegisteredPlayer, setHasRegisteredPlayer] = useState<boolean>(() => Boolean(api.getPlayerId()));
  const corkboardRef = useRef<HTMLDivElement>(null);
  const honoreeLabel = currentEvent?.name?.trim() || 'este evento';
  const safeFilenameBase = (currentEvent?.slug || slug || honoreeLabel)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'evento';
  const { isFlashing, isCapturing, captureError, downloadCorkboard } = useCorkboardCapture(
    corkboardRef,
    `cartelera-${safeFilenameBase}.png`
  );

  // Auto-abrir el sheet si viene de "Dejar tu Foto para Mile" (WelcomePage)
  // Funciona tanto para jugadores registrados como para invitados
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddOpen(true);
    }
  }, [searchParams]);

  const handleAddPostcard = async (image: File, message: string, senderName?: string) => {
    // Default sender name if not provided
    const name = senderName?.trim() || 'Anónimo';
    await createPostcard(image, message, name);
    if (!hasRegisteredPlayer && senderName?.trim()) {
      setHasRegisteredPlayer(true);
    }
  };

  // When gift box animation finishes, merge revealed postcards into board
  const handleRevealComplete = useCallback((revealed: Postcard[]) => {
    addRevealedPostcards(revealed);
    // Auto-open first revealed postcard in modal after a short delay
    if (revealed.length > 0) {
      setTimeout(() => setSelectedPostcard(revealed[0]), 1000);
    }
  }, [addRevealedPostcards]);

  const defaultBoardBackground = {
    background: `linear-gradient(180deg, color-mix(in srgb, ${theme.bgColor} 88%, white) 0%, color-mix(in srgb, ${theme.secondaryColor} 14%, ${theme.bgColor}) 100%)`,
  };

  return (
    <div ref={corkboardRef} className="relative isolate min-h-dvh overflow-x-hidden">
      {/* Fondo — custom si está configurado, sino fallback simple del tema */}
      <div
        data-cork-bg="true"
        className="fixed inset-0 z-0"
        style={backgroundUrl ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : defaultBoardBackground}
      />
      {/* Viñeta sutil sobre el corcho — también fija */}
      <div
        data-cork-vignette="true"
        className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.18)_100%)]"
      />

      {/* ── Estampillas decorativas (desktop / proyección) ──────────────────
          z-[2]: detrás de postcards (z-10) y el header, delante del fondo.
          Solo visible en pantallas medianas+. Se ocultan en mobile.          ── */}
      <div className="hidden md:block">
        <StampLayer />
      </div>

      {/* Botón guardar recuerdo — arriba a la derecha (desktop) */}
      <div data-export-hide="true" className="fixed top-4 right-4 z-40 hidden md:block">
        <motion.button
          className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm text-sm font-medium shadow-lg border cursor-pointer disabled:opacity-50"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
            color: textColor,
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}
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
              className="mt-2 px-3 py-2 rounded-lg text-white text-xs text-center shadow-lg max-w-[200px]"
              style={{ backgroundColor: '#EF4444' }}
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
          Dejá tu mensaje para {honoreeLabel}
        </motion.p>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-28 pointer-events-none">
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
            <div className="w-40 h-40 mx-auto mb-4">
              <LottieAnimation
                animationData={emptyAnimation}
                height={160}
                width={160}
                loop={true}
                autoplay={true}
              />
            </div>
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
                  eventLogoUrl={eventLogoUrl}
                  theme={theme}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Agregar postal (desktop only) */}
      <motion.button
        data-export-hide="true"
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full border-2 border-white/20 text-2xl text-white shadow-xl cursor-pointer md:flex"
        style={{ 
          backgroundColor: primaryColor,
          boxShadow: `0 10px 15px -3px ${primaryColor}30`
        }}
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

      {/* Botón volver — desktop only */}
      <div data-export-hide="true" className="fixed bottom-6 left-6 z-40 hidden md:block">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="backdrop-blur-sm shadow-lg bg-white/90"
          >
            ← Volver
          </Button>
        </motion.div>
      </div>

      {/* Modal de postal expandida */}
      <PostcardModal
        postcard={selectedPostcard}
        onClose={() => setSelectedPostcard(null)}
        theme={theme}
      />

      {/* Sheet para agregar postal */}
      <AddPostcardSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddPostcard}
        requireSenderName={!hasRegisteredPlayer}
      />

      {!isAddOpen && (
        <CorkboardMobileActionBar
          onGoHome={() => navigate('/')}
          onAddPostcard={() => setIsAddOpen(true)}
          onSaveSnapshot={downloadCorkboard}
          isSaving={isCapturing}
        />
      )}

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
