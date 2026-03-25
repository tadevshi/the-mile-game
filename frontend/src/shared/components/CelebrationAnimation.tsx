import { useEffect, useRef } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

import celebrationData from '@/../public/animations/celebration.json';

interface CelebrationAnimationProps {
  rank: 1 | 2 | 3;
  playerName: string;
  isVisible: boolean;
  onComplete?: () => void;
}

const medalColors: Record<number, { bg: string; text: string; border: string; emoji: string }> = {
  1: { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', text: 'text-amber-900', border: 'border-yellow-600', emoji: '🥇' },
  2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-400', text: 'text-gray-700', border: 'border-gray-500', emoji: '🥈' },
  3: { bg: 'bg-gradient-to-br from-orange-400 to-orange-500', text: 'text-orange-900', border: 'border-orange-600', emoji: '🥉' },
};

const rankMessages: Record<number, string> = {
  1: '¡PERFECTO! ¡Sos el mejor!',
  2: '¡Excelente! ¡Segundo lugar!',
  3: '¡Muy bien! ¡Tercer lugar!',
};

export function CelebrationAnimation({
  rank,
  playerName,
  isVisible,
  onComplete,
}: CelebrationAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const medal = medalColors[rank];

  // Trigger confetti when visible
  useEffect(() => {
    if (isVisible) {
      // Fire confetti bursts
      const colors = rank === 1 ? ['#FFD700', '#FFA500', '#FF69B4'] : 
                      rank === 2 ? ['#C0C0C0', '#A9A9A9', '#D3D3D3'] : 
                      ['#CD7F32', '#D2691E', '#F4A460'];

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });

      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
      }, 200);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
      }, 400);
    }
  }, [isVisible, rank]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lottie celebration animation */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 pointer-events-none">
              <Lottie
                lottieRef={lottieRef}
                animationData={celebrationData}
                loop={false}
                autoplay={true}
                style={{ height: '100%', width: '100%' }}
              />
            </div>

            {/* Medal card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className={`
                relative overflow-hidden rounded-3xl p-8 shadow-2xl
                bg-white/95 backdrop-blur-md border-4 ${medal.border}
                ${rank === 1 ? 'ring-4 ring-yellow-400/50' : ''}
              `}
            >
              {/* Medal emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="text-8xl mb-4 text-center"
              >
                {medal.emoji}
              </motion.div>

              {/* Rank badge */}
              <div className={`
                absolute top-4 right-4 ${medal.bg} ${medal.text}
                text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center
                shadow-lg
              `}>
                {rank}
              </div>

              {/* Message */}
              <div className="text-center space-y-2">
                <p className={`text-sm font-semibold uppercase tracking-wider ${medal.text}/60`}>
                  ¡Felicidades!
                </p>
                <h2 className="text-2xl font-display text-gray-800">
                  {playerName}
                </h2>
                <p className={`text-lg font-semibold ${medal.text}`}>
                  {rankMessages[rank]}
                </p>
              </div>

              {/* Confetti particles (CSS) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: 0,
                      y: 0,
                      rotate: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: (i % 2 === 0 ? 1 : -1) * (50 + i * 10),
                      y: -100 - i * 20,
                      rotate: 360 * (i % 2 === 0 ? 1 : -1),
                      opacity: 0,
                    }}
                    transition={{
                      delay: 0.3 + i * 0.05,
                      duration: 1 + i * 0.05,
                      ease: 'easeOut',
                    }}
                    className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full ${
                      i % 3 === 0 ? 'bg-yellow-400' : i % 3 === 1 ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Tap to dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-white/70 text-sm"
            >
              Toca en cualquier lugar para continuar
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
