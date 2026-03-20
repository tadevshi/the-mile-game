import { motion } from 'framer-motion';

// Componente base Skeleton
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export function LoadingSkeleton({ 
  width = '100%', 
  height = '20px', 
  className = '',
  circle = false 
}: SkeletonProps) {
  return (
    <motion.div
      className={`bg-pink-200/50 dark:bg-slate-700/50 relative overflow-hidden ${
        circle ? 'rounded-full' : 'rounded-lg'
      } ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

// Skeleton para texto (líneas)
interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}

export function LoadingSkeletonText({ 
  lines = 3, 
  lastLineWidth = '60%',
  className = '' 
}: SkeletonTextProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton 
          key={i} 
          height="16px"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

// Skeleton para avatar
interface SkeletonAvatarProps {
  size?: string;
  className?: string;
}

export function LoadingSkeletonAvatar({ 
  size = '64px', 
  className = '' 
}: SkeletonAvatarProps) {
  return (
    <LoadingSkeleton 
      width={size} 
      height={size} 
      circle 
      className={className}
    />
  );
}

// Skeleton para card genérico
interface SkeletonCardProps {
  className?: string;
}

export function LoadingSkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`bg-white/80 dark:bg-slate-800/80 rounded-2xl p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <LoadingSkeletonAvatar size="48px" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton height="16px" width="40%" />
          <LoadingSkeleton height="12px" width="25%" />
        </div>
      </div>
      <LoadingSkeletonText lines={2} lastLineWidth="70%" />
    </div>
  );
}

// Skeleton para página completa de dashboard
export function DashboardSkeletonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header Skeleton */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-pink-100 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LoadingSkeletonAvatar size="40px" />
            <div className="space-y-2">
              <LoadingSkeleton height="16px" width="120px" />
              <LoadingSkeleton height="12px" width="180px" />
            </div>
          </div>
          <LoadingSkeleton height="36px" width="100px" className="rounded-lg" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <LoadingSkeleton height="36px" width="200px" className="mb-2" />
          <LoadingSkeleton height="20px" width="140px" />
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
              <LoadingSkeleton height="8px" className="rounded-none" />
              
              <div className="p-5 space-y-4">
                {/* Title and badge */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <LoadingSkeleton height="20px" width="70%" />
                    <LoadingSkeleton height="14px" width="50%" />
                  </div>
                  <LoadingSkeleton height="24px" width="60px" className="rounded-full" />
                </div>

                {/* Date */}
                <div className="flex items-center gap-2">
                  <LoadingSkeleton height="16px" width="16px" className="rounded" />
                  <LoadingSkeleton height="14px" width="100px" />
                </div>

                {/* Feature pills */}
                <div className="flex gap-2">
                  <LoadingSkeleton height="24px" width="60px" className="rounded-full" />
                  <LoadingSkeleton height="24px" width="70px" className="rounded-full" />
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-3 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-2">
                <LoadingSkeleton height="36px" width="70px" className="rounded-lg" />
                <LoadingSkeleton height="36px" width="80px" className="rounded-lg" />
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
