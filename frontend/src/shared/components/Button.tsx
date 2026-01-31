import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'framer-motion';

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
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary hover:bg-accent text-white shadow-lg shadow-primary/30',
  secondary: 'bg-secondary hover:bg-primary text-pink-700 hover:text-white shadow-md',
  outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 text-sm',
  md: 'py-3 px-6 text-base',
  lg: 'py-5 px-8 text-xl',
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
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-full font-bold
        transition-all duration-300
        flex items-center justify-center gap-2
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
    >
      {/* Efecto hover sutil */}
      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      
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
