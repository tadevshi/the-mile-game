import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/shared/components/Confetti';
import type { Postcard } from '../types/postcards.types';

interface GiftBoxProps {
  postcards: Postcard[];
  onRevealComplete: (postcards: Postcard[]) => void;
}

type Phase = 'appear' | 'wobble' | 'open' | 'fly' | 'done';

// Posiciones finales en vw/vh — verificadas para no salirse del viewport en mobile
const CARD_SLOTS_RAW = [
  { xvw: -33, yvh: -20, rotate: -14 },
  { xvw:  27, yvh: -24, rotate:   9 },
  { xvw: -36, yvh:   8, rotate:  17 },
  { xvw:  32, yvh:   6, rotate:  -7 },
  { xvw: -12, yvh:  27, rotate: -19 },
  { xvw:  14, yvh:  25, rotate:  12 },
  { xvw:   1, yvh: -31, rotate:   4 },
  { xvw:  -1, yvh:  29, rotate:  -5 },
];

// Tiempo entre que cada carta empieza a volar — más rápido = más volcánico
const CARD_STAGGER_MS = 320;

export function GiftBox({ postcards, onRevealComplete }: GiftBoxProps) {
  const [phase, setPhase] = useState<Phase>('appear');
  const [lidGone, setLidGone] = useState(false);
  const [boxVisible, setBoxVisible] = useState(true);

  // Convertir vw/vh → píxeles una sola vez.
  // Necesitamos números reales para calcular pico y overshoot de la parábola.
  const cardTargets = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth  / 100 : 3.75;
    const vh = typeof window !== 'undefined' ? window.innerHeight / 100 : 8.12;
    return CARD_SLOTS_RAW.map(s => ({
      x:      s.xvw * vw,
      y:      s.yvh * vh,
      rotate: s.rotate,
    }));
  }, []);

  // Pico de la parábola: 52% de la altura del viewport hacia arriba desde el centro
  const peakY = useMemo(() => {
    if (typeof window === 'undefined') return -420;
    return -(window.innerHeight * 0.52);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('wobble'), 600),
      setTimeout(() => setPhase('open'),   2100),
      setTimeout(() => setLidGone(true),   2650),
      setTimeout(() => setPhase('fly'),    2850),
      // La caja desaparece cuando la 2ª carta ya está en vuelo → efecto "lanzadora"
      setTimeout(() => setBoxVisible(false), 2850 + CARD_STAGGER_MS * 1.6),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Se dispara cuando el ÚLTIMO keyframe de la ÚLTIMA carta se estabiliza
  const handleLastCardLanded = useCallback(() => {
    fireConfetti({ particleCount: 160, spread: 120, origin: { x: 0.5, y: 0.55 }, zIndex: 200 });
    setTimeout(() => {
      fireConfetti({ particleCount: 90, spread: 150, origin: { x: 0.1, y: 0.4 }, zIndex: 200 });
      fireConfetti({ particleCount: 90, spread: 150, origin: { x: 0.9, y: 0.4 }, zIndex: 200 });
    }, 180);
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
                        y: -200, x: 18, opacity: 0, rotate: -38,
                        transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
                      }}
                    >
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-7 bg-white/30 rounded" />
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
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/70" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cuerpo */}
                <div
                  className="w-52 h-48 rounded-b-xl relative overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(160deg, #fb7185 0%, #f43f5e 50%, #e11d48 100%)',
                    boxShadow:
                      '0 8px 40px rgba(244,63,94,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  <div className="absolute inset-x-0 top-0 bottom-0 left-1/2 -translate-x-1/2 w-7 bg-white/25" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 bg-white/25" />

                  <AnimatePresence>
                    {(phase === 'open' || phase === 'fly') && (
                      <>
                        {[...Array(8)].map((_, i) => (
                          <motion.span
                            key={i}
                            className="absolute text-xl"
                            style={{
                              left: `${8 + (i % 4) * 22}%`,
                              top:  `${20 + Math.floor(i / 4) * 40}%`,
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

          {/* ── Postales con arco parabólico ── */}
          {phase === 'fly' && (
            <div className="absolute inset-0 pointer-events-none">
              {postcards.map((pc, i) => {
                const slot    = cardTargets[i % cardTargets.length];
                const isLast  = i === postcards.length - 1;
                const delayS  = i * (CARD_STAGGER_MS / 1000);

                // Pico: sale casi recto hacia arriba, deriva un 12% hacia el destino final
                const peakX = slot.x * 0.12;

                // Overshoot: aterriza un poco más allá de la posición final y rebota
                const overshootX = slot.x * 1.05;
                const overshootY = slot.y + 16; // siempre "pasa de largo" hacia abajo

                // 4 keyframes:
                //   [0]   origen  — sale de la caja (centro)
                //   [1]   pico    — erupción hacia arriba (fast easeOut)
                //   [2]   overshoot — aterriza un poco más allá (gravity arc)
                //   [3]   settle  — rebota suave a posición final
                return (
                  <motion.div
                    key={pc.id}
                    className="absolute w-36 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border-[3px] border-white"
                    style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%' }}
                    initial={{ scale: 0, x: 0, y: 0, rotate: 0, opacity: 0 }}
                    animate={{
                      x:      [0,      peakX,              overshootX,          slot.x],
                      y:      [0,      peakY,              overshootY,          slot.y],
                      rotate: [0,      slot.rotate * 0.2,  slot.rotate * 1.1,   slot.rotate],
                      scale:  [0,      1.25,               0.90,                1.0],
                      opacity:[0,      1,                  1,                   1],
                    }}
                    onAnimationComplete={isLast ? handleLastCardLanded : undefined}
                    transition={{
                      duration: 1.6,
                      delay:    delayS,
                      times:    [0,    0.24,   0.82,   1.0],
                      ease: [
                        // 0→1  Erupción explosiva: arranca brutal, frenada corta
                        [0.04, 0.3, 0.18, 1.0],
                        // 1→2  Caída gravitatoria: aceleración suave, desacelera al llegar
                        [0.28, 0.0, 0.58, 0.96],
                        // 2→3  Rebote de asentamiento: easeOut suave
                        [0.25, 0.5, 0.5,  1.0],
                      ],
                    }}
                  >
                    <img
                      src={pc.image_path}
                      alt={pc.player_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-white text-[9px] font-semibold truncate">
                        🎁 {pc.player_name}
                      </p>
                    </div>

                    {/* Pin que se "clava" al aterrizar */}
                    <motion.div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-md"
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, #f87171, #dc2626)',
                        border: '2px solid #991b1b',
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        // Aparece ~200ms antes del final del arco (cuando el overshoot empieza)
                        delay: delayS + 1.6 * 0.82 - 0.1,
                        type:  'spring',
                        stiffness: 600,
                        damping:   12,
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
