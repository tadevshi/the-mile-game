import { motion } from 'framer-motion';
import { Skeleton, SkeletonAvatar } from '@/shared/components/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header Skeleton */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-pink-100 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="40px" />
            <div className="space-y-2">
              <Skeleton height="16px" width="120px" />
              <Skeleton height="12px" width="180px" />
            </div>
          </div>
          <Skeleton height="36px" width="100px" className="rounded-lg" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <Skeleton height="36px" width="200px" className="mb-2" />
          <Skeleton height="20px" width="140px" />
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden"
            >
              {/* Gradient bar */}
              <Skeleton height="8px" className="rounded-none" />
              
              <div className="p-5 space-y-4">
                {/* Title and badge */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton height="20px" width="70%" />
                    <Skeleton height="14px" width="50%" />
                  </div>
                  <Skeleton height="24px" width="60px" className="rounded-full" />
                </div>

                {/* Date */}
                <div className="flex items-center gap-2">
                  <Skeleton height="16px" width="16px" className="rounded" />
                  <Skeleton height="14px" width="100px" />
                </div>

                {/* Feature pills */}
                <div className="flex gap-2">
                  <Skeleton height="24px" width="60px" className="rounded-full" />
                  <Skeleton height="24px" width="70px" className="rounded-full" />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <Skeleton height="8px" width="8px" className="rounded-full" />
                  <Skeleton height="12px" width="50px" />
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-3 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-2">
                <Skeleton height="36px" width="70px" className="rounded-lg" />
                <Skeleton height="36px" width="80px" className="rounded-lg" />
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
