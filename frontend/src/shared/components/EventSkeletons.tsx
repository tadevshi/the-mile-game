import { motion } from 'framer-motion';
import { LoadingSkeleton, LoadingSkeletonText, LoadingSkeletonAvatar } from './LoadingSkeleton';

/**
 * Skeleton loading state para la landing page de un evento público.
 * Muestra Placeholders mientras se carga el evento.
 */
export function EventLandingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-primary) 15%, white), color-mix(in srgb, var(--color-primary) 10%, white), color-mix(in srgb, var(--color-primary) 20%, white))' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-block mb-4">
            <LoadingSkeleton width="48px" height="48px" circle />
          </div>
          <LoadingSkeleton width="200px" height="48px" className="mx-auto mb-2" />
          <LoadingSkeleton width="150px" height="20px" className="mx-auto" />
        </motion.div>

        {/* Info Card Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg border border-white/50 p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <LoadingSkeleton width="40px" height="40px" circle />
              <div className="space-y-2">
                <LoadingSkeleton width="60px" height="14px" />
                <LoadingSkeleton width="150px" height="16px" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/80 rounded-2xl p-6 shadow-lg">
              <div className="space-y-4">
                <LoadingSkeleton width="48px" height="48px" />
                <LoadingSkeleton width="100px" height="24px" />
                <LoadingSkeletonText lines={2} lastLineWidth="80%" />
                <LoadingSkeleton width="80px" height="16px" />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Footer Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <LoadingSkeleton width="150px" height="14px" className="mx-auto" />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state para el quiz dentro de un evento.
 */
export function EventQuizSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-primary) 15%, white), color-mix(in srgb, var(--color-primary) 10%, white), color-mix(in srgb, var(--color-primary) 20%, white))' }}>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Bar Skeleton */}
        <div className="flex items-center gap-4">
          <LoadingSkeleton width="60px" height="12px" />
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
            <motion.div
              className="h-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}
              initial={{ width: '0%' }}
              animate={{ width: '30%' }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Question Card Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 space-y-6"
        >
          <LoadingSkeleton width="80%" height="32px" className="mx-auto" />
          <LoadingSkeleton width="60%" height="20px" className="mx-auto" />
          
          {/* Options Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <LoadingSkeleton key={i} height="56px" />
            ))}
          </div>
          
          {/* Submit Button Skeleton */}
          <div className="flex justify-center">
            <LoadingSkeleton width="200px" height="48px" className="rounded-full" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state para el ranking dentro de un evento.
 */
export function RankingSkeletonPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-primary) 15%, white), color-mix(in srgb, var(--color-primary) 10%, white), color-mix(in srgb, var(--color-primary) 20%, white))' }}>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Podium Skeleton */}
        <div className="flex items-end justify-center gap-4 py-8">
          {[2, 1, 3].map((pos) => (
            <motion.div
              key={pos}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pos * 0.1 }}
              className="flex flex-col items-center"
            >
              <LoadingSkeletonAvatar size={pos === 1 ? '72px' : '56px'} />
              <LoadingSkeleton width="80px" height="16px" className="mt-2" />
              <LoadingSkeleton width="40px" height="24px" />
              <div
                className="rounded-t-lg"
                style={{
                  width: pos === 1 ? '80px' : '64px',
                  height: pos === 1 ? '100px' : pos === 2 ? '80px' : '60px',
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4"
            >
              <LoadingSkeleton width="32px" height="32px" />
              <LoadingSkeletonAvatar size="40px" />
              <div className="flex-1 space-y-2">
                <LoadingSkeleton width="60%" height="16px" />
                <LoadingSkeleton width="40%" height="12px" />
              </div>
              <LoadingSkeleton width="48px" height="24px" className="rounded-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
