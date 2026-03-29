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
  // theme is available via CSS variables - no need to read from JS
  
  // Get the button style based on variant and theme
  // Uses CSS variables injected by ThemeProvider
  const getButtonStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          boxShadow: 'var(--shadow-lg)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-secondary)',
          color: 'var(--color-on-secondary)',
          boxShadow: 'var(--shadow-md)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          border: '2px solid var(--color-primary)',
          color: 'var(--color-on-background)',
          boxShadow: 'var(--shadow-sm)',
        };
      default:
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
        };
    }
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`
        relative overflow-hidden rounded-[var(--radius-lg)]
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
      <span className="relative z-10 flex items-center justify-center gap-2">
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
