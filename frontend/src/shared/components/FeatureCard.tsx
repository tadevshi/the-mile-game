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
      className={`rounded-[var(--radius-lg)] p-6 border shadow-sm hover:shadow-md transition-shadow ${className}`}
      style={{
        background: 'linear-gradient(to bottom right, var(--color-background), var(--color-background-alt))',
        borderColor: 'var(--color-border-light)',
      }}
    >
      {/* Icon */}
      <div className="text-5xl mb-4">{icon}</div>
      
      {/* Badge */}
      {badge && (
        <span 
          className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
            color: 'var(--color-primary)',
          }}
        >
          {badge}
        </span>
      )}
      
      {/* Title */}
      <h3 
        className="text-xl font-semibold mb-2"
        style={{ color: 'var(--color-on-background)' }}
      >
        {title}
      </h3>
      
      {/* Description */}
      <p 
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-on-surface-muted)' }}
      >
        {description}
      </p>
    </motion.div>
  );
}
