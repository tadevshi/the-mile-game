import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/shared/theme/useTheme';

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
  const { currentTheme: theme } = useTheme();
  
  // Get card style based on variant and theme
  const getCardStyle = (): React.CSSProperties => {
    const isDark = theme.backgroundStyle === 'dark';

    switch (variant) {
      case 'default':
        return {
          backgroundColor: isDark ? 'var(--color-surface, #1E293B)' : 'var(--color-surface, #FFFFFF)',
          boxShadow: isDark
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        };
      case 'glass':
        return {
          backgroundColor: isDark
            ? 'rgba(30, 25, 26, 0.7)'
            : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: isDark
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          border: `2px solid ${theme.primaryColor}40`,
        };
      default:
        return {};
    }
  };

  const baseStyle = getCardStyle();
  const baseClasses = `rounded-2xl ${paddingStyles[padding]} ${className}`;

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
