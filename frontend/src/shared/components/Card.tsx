import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'framer-motion';

type CardVariant = 'default' | 'glass' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  isHoverable?: boolean;
  isPressable?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-slate-800 shadow-lg',
  glass: 'glass-card shadow-lg',
  outlined: 'bg-transparent border-2 border-primary/30',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  isHoverable = false,
  isPressable = false,
  onClick,
  className = '',
}: CardProps) {
  const baseClasses = `
    rounded-2xl
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${className}
  `;

  // Si es presionable, usamos motion.div con efectos de tap
  if (isPressable) {
    return (
      <motion.div
        whileHover={isHoverable ? { y: -2, scale: 1.01 } : undefined}
        whileTap={{ scale: 0.98 }}
        className={`${baseClasses} cursor-pointer`}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  // Si solo es hovereable (sin tap)
  if (isHoverable) {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={baseClasses}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  // Card estática
  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );
}
