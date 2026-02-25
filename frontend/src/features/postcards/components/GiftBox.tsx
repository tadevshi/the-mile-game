import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/shared/components/Confetti';
import type { Postcard } from '../types/postcards.types';

interface GiftBoxProps {
  postcards: Postcard[];
  onRevealComplete: (postcards: Postcard[]) => void;
}

type Phase = 'appear' | 'wobble' | 'open' | 'fly' | 'done';

export function GiftBox({ postcards, onRevealComplete }: GiftBoxProps) {
  const [phase, setPhase] = useState<Phase>('appear');
  const [lidGone, setLidGone] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  // Drive the animation phases sequentially
  useEffect(() => {
    // appear → wobble (400ms)
    const t1 = setTimeout(() => setPhase('wobble'), 400);
    // wobble → open (400 + 1500ms)
    const t2 = setTimeout(() => setPhase('open'), 1900);
    // lid fades (100ms after open)
    const t3 = setTimeout(() => setLidGone(true), 2500);
    // open → fly (2000ms)
    const t4 = setTimeout(() => setPhase('fly'), 2600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Stagger fly-in of postcards
  useEffect(() => {
    if (phase !== 'fly') return;
    let count = 0;
    let completionTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= postcards.length) {
        clearInterval(interval);
        // Última postal clavada — disparar confetti espectacular 🎊
        fireConfetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, zIndex: 200 });
        // Segunda explosión con delay para más impacto
        setTimeout(() => {
          fireConfetti({ particleCount: 80, spread: 120, origin: { x: 0.2, y: 0.5 }, zIndex: 200 });
          fireConfetti({ particleCount: 80, spread: 120, origin: { x: 0.8, y: 0.5 }, zIndex: 200 });
        }, 300);
        // After last postcard lands, wait then complete
        completionTimeout = setTimeout(() => {
          setPhase('done');
          onRevealComplete(postcards);
        }, 1200);
      }
    }, 700);
    return () => {
      clearInterval(interval);
      if (completionTimeout !== null) {
        clearTimeout(completionTimeout);
      }
    };
  }, [phase, postcards, onRevealComplete]);

  const isBoxVisible = phase !== 'done';

  return (
    <AnimatePresence>
      {isBoxVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Gift Box */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={
              phase === 'appear'
                ? { scale: 1, opacity: 1 }
                : phase === 'wobble'
                ? {
                    scale: 1,
                    opacity: 1,
                    rotate: [0, -6, 6, -6, 6, -3, 3, 0],
                    transition: { duration: 1.5, ease: 'easeInOut' },
                  }
                : phase === 'open'
                ? { scale: 1.05, opacity: 1 }
                : { scale: 0, opacity: 0, transition: { duration: 0.4 } }
            }
            transition={
              phase === 'appear'
                ? { type: 'spring', stiffness: 350, damping: 22 }
                : undefined
            }
          >
            {/* Lid */}
            <AnimatePresence>
              {!lidGone && (
                <motion.div
                  className="w-52 h-16 rounded-t-xl relative mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #f472b6, #ec4899)',
                    boxShadow: '0 4px 20px rgba(236,72,153,0.5)',
                  }}
                  exit={{
                    y: -120,
                    opacity: 0,
                    rotate: -25,
                    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
                  }}
                >
                  {/* Lid ribbon horizontal */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-7 bg-white/30 rounded" />
                  {/* Bow */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1">
                    <div
                      className="w-8 h-8 rounded-full border-4 border-white/70"
                      style={{ background: 'rgba(255,255,255,0.25)' }}
                    />
                    <div
                      className="w-8 h-8 rounded-full border-4 border-white/70"
                      style={{ background: 'rgba(255,255,255,0.25)' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Box body */}
            <div
              className="w-52 h-48 rounded-b-xl rounded-t-none relative overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #fb7185, #f43f5e)',
                boxShadow: '0 8px 32px rgba(244,63,94,0.45)',
              }}
            >
              {/* Vertical ribbon */}
              <div className="absolute inset-x-0 top-0 bottom-0 left-1/2 -translate-x-1/2 w-7 bg-white/25" />
              {/* Horizontal ribbon */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 bg-white/25" />

              {/* Sparkles inside box when open */}
              <AnimatePresence>
                {phase === 'open' && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <motion.span
                        key={i}
                        className="absolute text-lg"
                        style={{
                          left: `${15 + (i % 3) * 30}%`,
                          top: `${20 + Math.floor(i / 3) * 40}%`,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: -30 }}
                        transition={{ delay: i * 0.1, duration: 0.7 }}
                      >
                        ✨
                      </motion.span>
                    ))}
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Label */}
            <motion.p
              className="mt-4 text-white text-lg font-display drop-shadow-lg"
              animate={
                phase === 'wobble'
                  ? { scale: [1, 1.05, 1], transition: { repeat: 2, duration: 0.5 } }
                  : {}
              }
            >
              {phase === 'appear' && '🎁 ¡Hay una sorpresa!'}
              {phase === 'wobble' && '🎁 ¡Hay una sorpresa!'}
              {(phase === 'open' || phase === 'fly') && '✨ ¡Postales secretas!'}
            </motion.p>
          </motion.div>

          {/* Postcards flying out */}
          {phase === 'fly' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {postcards.slice(0, visibleCount).map((pc, i) => {
                // Spread them across the viewport
                const cols = Math.min(postcards.length, 4);
                const col = i % cols;
                const row = Math.floor(i / cols);
                const targetX = -50 + (col / (cols - 1 || 1)) * 100; // vw %
                const targetY = -35 + row * 40; // vh %

                return (
                  <motion.div
                    key={pc.id}
                    className="absolute w-32 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border-4 border-white"
                    style={{
                      top: '50%',
                      left: '50%',
                      translateX: '-50%',
                      translateY: '-50%',
                      rotate: `${((i * 37) % 20) - 10}deg`,
                    }}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{
                      scale: 1,
                      x: `${targetX}vw`,
                      y: `${targetY}vh`,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: 0.05,
                    }}
                  >
                    <img
                      src={pc.image_path}
                      alt={pc.player_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-1">
                      <p className="text-white text-[9px] font-semibold truncate">
                        🎁 {pc.player_name}
                      </p>
                    </div>
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
