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
  // Card styles use CSS variables directly
  
  // Get card style based on variant and theme
  // Uses CSS variables injected by ThemeProvider
  const getCardStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border-light)',
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: 'var(--shadow-lg)',
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          border: '2px solid var(--color-border)',
        };
      default:
        return {};
    }
  };

  const baseStyle = getCardStyle();
  const baseClasses = `rounded-[var(--radius-lg)] ${paddingStyles[padding]} ${className}`;

  // Si es presionable, usamos motion.div con efectos de tap
  if (isPressable) {
    return (
      <motion.div
        whileHover={isHoverable ? { y: -2, scale: 1.01 } : undefined}
        whileTap={{ scale: 0.98 }}
        className={`${baseClasses} cursor-pointer`}
        style={baseStyle}
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
        style={baseStyle}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  // Card estática
  return (
    <div className={baseClasses} style={baseStyle} onClick={onClick}>
      {children}
    </div>
  );
}
