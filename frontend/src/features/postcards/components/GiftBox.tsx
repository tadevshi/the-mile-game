import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/shared/components/Confetti';
import type { Postcard } from '../types/postcards.types';

interface GiftBoxProps {
  postcards: Postcard[];
  onRevealComplete: (postcards: Postcard[]) => void;
}

type Phase = 'appear' | 'wobble' | 'open' | 'fly' | 'done';

// Posiciones orgánicas — no una grilla. Distribuidas para cubrir la pantalla sin
// amontonarse, verificadas para no salirse del viewport en mobile (375×812).
const CARD_SLOTS = [
  { x: '-36vw', y: '-22vh', rotate: -14 },
  { x:  '30vw', y: '-26vh', rotate:   9 },
  { x: '-38vw', y:   '7vh', rotate:  17 },
  { x:  '34vw', y:   '5vh', rotate:  -7 },
  { x: '-14vw', y:  '28vh', rotate: -19 },
  { x:  '16vw', y:  '26vh', rotate:  12 },
  { x:   '2vw', y: '-34vh', rotate:   4 },
  { x:  '-2vw', y:  '32vh', rotate:  -5 },
];

// Tiempo (ms) entre que cada carta empieza a volar
const CARD_STAGGER_MS = 450;

export function GiftBox({ postcards, onRevealComplete }: GiftBoxProps) {
  const [phase, setPhase] = useState<Phase>('appear');
  const [lidGone, setLidGone] = useState(false);
  const [boxVisible, setBoxVisible] = useState(true);

  // Timeline secuencial de fases
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('wobble'), 600),
      setTimeout(() => setPhase('open'),   2200),
      setTimeout(() => setLidGone(true),   2750),
      setTimeout(() => setPhase('fly'),    2950),
      // La caja desaparece cuando la 2ª carta ya está volando
      // → da sensación de "lanzadora", no de estorbo
      setTimeout(() => setBoxVisible(false), 2950 + CARD_STAGGER_MS * 1.8),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Dispara cuando el spring de la ÚLTIMA carta se estabiliza (onAnimationComplete)
  // → confetti perfectamente sincronizado con el aterrizaje
  const handleLastCardLanded = useCallback(() => {
    // Explosión central
    fireConfetti({ particleCount: 160, spread: 120, origin: { x: 0.5, y: 0.55 }, zIndex: 200 });
    // Explosiones laterales con 180ms de delay → efecto de ola
    setTimeout(() => {
      fireConfetti({ particleCount: 90, spread: 150, origin: { x: 0.1, y: 0.4 }, zIndex: 200 });
      fireConfetti({ particleCount: 90, spread: 150, origin: { x: 0.9, y: 0.4 }, zIndex: 200 });
    }, 180);
    // Dar tiempo a que el confetti se vea, luego completar
    setTimeout(() => {
      setPhase('done');
      onRevealComplete(postcards);
    }, 1600);
  }, [postcards, onRevealComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Fondo oscuro */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          {/* ── Caja de regalo ── */}
          <AnimatePresence>
            {boxVisible && (
              <motion.div
                className="relative z-10 flex flex-col items-center"
                initial={{ scale: 0, opacity: 0, y: 60 }}
                animate={
                  phase === 'appear'
                    ? { scale: 1, opacity: 1, y: 0 }
                    : phase === 'wobble'
                    ? {
                        scale: 1, opacity: 1, y: 0,
                        rotate: [0, -9, 9, -8, 8, -5, 5, -2, 2, 0],
                      }
                    : { scale: 1.06, opacity: 1, y: 0, rotate: 0 }
                }
                exit={{
                  scale: 0.7,
                  opacity: 0,
                  y: 30,
                  transition: { duration: 0.5, ease: 'easeIn' },
                }}
                transition={
                  phase === 'appear'
                    ? { type: 'spring', stiffness: 280, damping: 18 }
                    : phase === 'wobble'
                    ? { duration: 1.6, ease: 'easeInOut' }
                    : { type: 'spring', stiffness: 400, damping: 20 }
                }
              >
                {/* Tapa */}
                <AnimatePresence>
                  {!lidGone && (
                    <motion.div
                      className="w-52 h-16 rounded-t-xl relative mb-1"
                      style={{
                        background:
                          'linear-gradient(135deg, #f472b6 0%, #ec4899 60%, #db2777 100%)',
                        boxShadow:
                          '0 4px 24px rgba(236,72,153,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                      exit={{
                        y: -200,
                        x: 18,
                        opacity: 0,
                        rotate: -38,
                        transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
                      }}
                    >
                      {/* Cinta horizontal */}
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-7 bg-white/30 rounded" />
                      {/* Moño */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-2">
                        <div
                          className="w-9 h-9 rounded-full border-4 border-white/80"
                          style={{ background: 'rgba(255,255,255,0.28)' }}
                        />
                        <div
                          className="w-9 h-9 rounded-full border-4 border-white/80"
                          style={{ background: 'rgba(255,255,255,0.28)' }}
                        />
                      </div>
                      {/* Nudo central */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/70" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cuerpo de la caja */}
                <div
                  className="w-52 h-48 rounded-b-xl relative overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(160deg, #fb7185 0%, #f43f5e 50%, #e11d48 100%)',
                    boxShadow:
                      '0 8px 40px rgba(244,63,94,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {/* Cintas */}
                  <div className="absolute inset-x-0 top-0 bottom-0 left-1/2 -translate-x-1/2 w-7 bg-white/25" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 bg-white/25" />

                  {/* Sparkles que salen al abrir */}
                  <AnimatePresence>
                    {(phase === 'open' || phase === 'fly') && (
                      <>
                        {[...Array(8)].map((_, i) => (
                          <motion.span
                            key={i}
                            className="absolute text-xl"
                            style={{
                              left: `${8 + (i % 4) * 22}%`,
                              top: `${20 + Math.floor(i / 4) * 40}%`,
                            }}
                            initial={{ opacity: 0, scale: 0, y: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: -60 }}
                            transition={{ delay: i * 0.07, duration: 0.9 }}
                          >
                            ✨
                          </motion.span>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Texto debajo de la caja */}
                <motion.p
                  className="mt-4 text-white text-lg font-display drop-shadow-lg text-center"
                  animate={
                    phase === 'wobble'
                      ? { scale: [1, 1.1, 1, 1.1, 1], transition: { duration: 1.2 } }
                      : {}
                  }
                >
                  {(phase === 'appear' || phase === 'wobble') && '🎁 ¡Hay una sorpresa!'}
                  {(phase === 'open' || phase === 'fly') && '✨ ¡Postales secretas!'}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Postales volando ── */}
          {phase === 'fly' && (
            <div className="absolute inset-0 pointer-events-none">
              {postcards.map((pc, i) => {
                const slot = CARD_SLOTS[i % CARD_SLOTS.length];
                const isLast = i === postcards.length - 1;
                const delayS = i * (CARD_STAGGER_MS / 1000);

                return (
                  <motion.div
                    key={pc.id}
                    className="absolute w-36 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border-[3px] border-white"
                    style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%' }}
                    initial={{ scale: 0, x: 0, y: 0, rotate: 0, opacity: 0 }}
                    animate={{ scale: 1, x: slot.x, y: slot.y, rotate: slot.rotate, opacity: 1 }}
                    // onAnimationComplete en la ÚLTIMA carta → confetti al aterrizar
                    onAnimationComplete={isLast ? handleLastCardLanded : undefined}
                    transition={{
                      delay: delayS,
                      // Stiffness y damping varían levemente por carta → no aterrizan igual
                      type: 'spring',
                      stiffness: 140 + (i % 4) * 15,
                      damping:    12 + (i % 3) * 3,
                      opacity: { duration: 0.25, delay: delayS, ease: 'easeIn' },
                    }}
                  >
                    <img
                      src={pc.image_path}
                      alt={pc.player_name}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradiente inferior para legibilidad */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-white text-[9px] font-semibold truncate">
                        🎁 {pc.player_name}
                      </p>
                    </div>
                    {/* Pin que aparece después de que la carta aterriza */}
                    <motion.div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-md"
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, #f87171, #dc2626)',
                        border: '2px solid #991b1b',
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        // El pin "pincha" 400ms después de que la carta empieza a volar
                        delay: delayS + 0.4,
                        type: 'spring',
                        stiffness: 500,
                        damping: 15,
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
