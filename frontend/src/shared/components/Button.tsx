import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/shared/theme/useTheme';
import { getContrastColor } from '@/themes/types';

type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-2.5 px-4 text-sm min-h-[40px]',
  md: 'py-3 px-5 text-base min-h-[48px]',
  lg: 'py-4 px-6 text-lg min-h-[52px]',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading = false,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  style: externalStyle,
}: ButtonProps) {
  const { currentTheme: theme } = useTheme();
  
  // Get the button style based on variant and theme
  const getButtonStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.primaryColor,
          color: getContrastColor(theme.primaryColor),
          boxShadow: `0 10px 15px -3px ${theme.primaryColor}30`,
        };
      case 'secondary':
        return {
          backgroundColor: theme.secondaryColor,
          color: getContrastColor(theme.secondaryColor),
          boxShadow: `0 4px 6px -1px ${theme.secondaryColor}40`,
        };
      case 'outline':
        // Outline: texto con alto contraste contra fondo transparente
        // Usamos el color de texto del tema para mejor legibilidad
        return {
          backgroundColor: 'transparent',
          border: `2px solid ${theme.primaryColor}`,
          color: theme.primaryColor,
          boxShadow: `0 4px 6px -1px ${theme.primaryColor}20`,
        };
      default:
        return { backgroundColor: theme.primaryColor };
    }
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`
        relative overflow-hidden rounded-xl
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : 'inline-flex'}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{ ...getButtonStyle(), ...externalStyle }}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
    >
      {/* Hover overlay effect */}
      {!disabled && !isLoading && (
        <motion.div 
          className="absolute inset-0 bg-white/10"
          initial={{ translateY: '100%' }}
          whileHover={{ translateY: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Contenido */}
      <span className="relative z-10 flex items-center gap-2">
        {isLoading ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <>
            {children}
            {icon}
          </>
        )}
      </span>
    </motion.button>
  );
}
