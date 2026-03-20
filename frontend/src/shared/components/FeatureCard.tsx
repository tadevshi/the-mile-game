import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function FeatureCard({ 
  icon, 
  title, 
  description, 
  badge,
  className = '' 
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`bg-gradient-to-br from-pink-50 to-rose-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-6 border border-pink-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {/* Icon */}
      <div className="text-5xl mb-4">{icon}</div>
      
      {/* Badge */}
      {badge && (
        <span className="inline-block px-2 py-1 text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 rounded-full mb-3">
          {badge}
        </span>
      )}
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
