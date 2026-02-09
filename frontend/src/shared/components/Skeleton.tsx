import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Componente base Skeleton
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export function Skeleton({ 
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

export function SkeletonText({ 
  lines = 3, 
  lastLineWidth = '60%',
  className = '' 
}: SkeletonTextProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
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

export function SkeletonAvatar({ 
  size = '64px', 
  className = '' 
}: SkeletonAvatarProps) {
  return (
    <Skeleton 
      width={size} 
      height={size} 
      circle 
      className={className}
    />
  );
}

// Skeleton para card
interface SkeletonCardProps {
  className?: string;
  header?: boolean;
  contentLines?: number;
  footer?: boolean;
}

export function SkeletonCard({ 
  className = '',
  header = true,
  contentLines = 2,
  footer = false
}: SkeletonCardProps) {
  return (
    <div className={`bg-white/80 dark:bg-slate-800/80 rounded-2xl p-4 space-y-4 ${className}`}>
      {header && (
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="48px" />
          <div className="flex-1 space-y-2">
            <Skeleton height="16px" width="40%" />
            <Skeleton height="12px" width="25%" />
          </div>
        </div>
      )}
      
      <SkeletonText lines={contentLines} lastLineWidth="70%" />
      
      {footer && (
        <div className="pt-2">
          <Skeleton height="40px" />
        </div>
      )}
    </div>
  );
}

// Skeleton para el Ranking completo
export function RankingSkeleton() {
  return (
    <div className="space-y-6 px-6 py-8">
      {/* Header skeleton */}
      <div className="text-center space-y-4">
        <Skeleton height="40px" width="60%" className="mx-auto" />
        <Skeleton height="20px" width="40%" className="mx-auto" />
        {/* Progress bar skeleton */}
        <Skeleton height="12px" width="80%" className="mx-auto rounded-full" />
      </div>

      {/* Podio skeleton */}
      <div className="flex items-end justify-center gap-4 h-48">
        {/* 2do lugar */}
        <div className="flex flex-col items-center space-y-2">
          <SkeletonAvatar size="56px" />
          <Skeleton height="64px" width="80px" className="rounded-t-xl" />
        </div>
        {/* 1er lugar */}
        <div className="flex flex-col items-center space-y-2">
          <SkeletonAvatar size="64px" />
          <Skeleton height="96px" width="80px" className="rounded-t-xl" />
        </div>
        {/* 3er lugar */}
        <div className="flex flex-col items-center space-y-2">
          <SkeletonAvatar size="48px" />
          <Skeleton height="48px" width="80px" className="rounded-t-xl" />
        </div>
      </div>

      {/* Lista skeleton */}
      <div className="space-y-3">
        <Skeleton height="12px" width="30%" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard 
            key={i} 
            header 
            contentLines={0}
            className="py-3"
          />
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="pt-6 space-y-3">
        <Skeleton height="48px" />
        <Skeleton height="12px" width="50%" className="mx-auto" />
      </div>
    </div>
  );
}

// Skeleton para Quiz completo
export function QuizSkeleton() {
  return (
    <div className="space-y-8 px-6 py-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton height="36px" width="70%" className="mx-auto" />
        <Skeleton height="16px" width="50%" className="mx-auto" />
        <Skeleton height="12px" width="60%" className="mx-auto rounded-full" />
      </div>

      {/* Preguntas favoritas */}
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton height="16px" width="80%" />
            <Skeleton height="48px" />
          </div>
        ))}
      </div>

      {/* Sección preferencias */}
      <div className="space-y-4">
        <Skeleton height="20px" width="60%" className="mx-auto" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton height="16px" width="90%" />
              <div className="flex gap-2">
                <Skeleton width="32px" height="32px" circle />
                <Skeleton width="32px" height="32px" circle />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-4">
        <Skeleton height="20px" width="50%" className="mx-auto" />
        <Skeleton height="96px" />
      </div>

      {/* Botón */}
      <Skeleton height="56px" className="rounded-full" />
    </div>
  );
}

// Skeleton genérico con children (para envolver contenido)
interface SkeletonContainerProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SkeletonContainer({ 
  isLoading, 
  skeleton, 
  children, 
  className = '' 
}: SkeletonContainerProps) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>;
  }
  return <>{children}</>;
}
