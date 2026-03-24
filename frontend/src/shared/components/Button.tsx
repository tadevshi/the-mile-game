import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/shared/theme/useTheme';

/**
 * Calculate relative luminance of a color (WCAG formula)
 */
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Get contrast ratio between two colors
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2) + 0.05;
  const darker = Math.min(l1, l2) + 0.05;
  return lighter / darker;
}

/**
 * Darken a hex color by a percentage (0-1)
 */
function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

/**
 * Ensure a color has at least 4.5:1 contrast ratio with white
 * If not, darken it until it does
 */
function ensureContrastWithWhite(hex: string): string {
  const contrastWithWhite = getContrastRatio(hex, '#FFFFFF');
  if (contrastWithWhite >= 4.5) {
    return hex;
  }
  // Need to darken until we get 4.5:1
  // Iteratively darken until contrast is sufficient (max 10 iterations)
  let current = hex;
  for (let i = 0; i < 10; i++) {
    current = darkenColor(current, 0.15);
    if (getContrastRatio(current, '#FFFFFF') >= 4.5) {
      return current;
    }
  }
  return current; // Fallback to darkest we got
}

/**
 * Ensure a color has at least 4.5:1 contrast ratio with dark text (#1E293B)
 * If not, lighten it until it does
 */
function ensureContrastWithDark(hex: string): string {
  const contrastWithDark = getContrastRatio(hex, '#1E293B');
  if (contrastWithDark >= 4.5) {
    return hex;
  }
  // Need to lighten until we get 4.5:1
  // Iteratively lighten until contrast is sufficient (max 10 iterations)
  let current = hex;
  for (let i = 0; i < 10; i++) {
    // Lighten by blending towards white
    current = lightenColor(current, 0.2);
    if (getContrastRatio(current, '#1E293B') >= 4.5) {
      return current;
    }
  }
  return current; // Fallback
}

/**
 * Lighten a hex color by blending towards white
 */
function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.min(255, r + (255 - r) * amount);
  const newG = Math.min(255, g + (255 - g) * amount);
  const newB = Math.min(255, b + (255 - b) * amount);
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
}

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
        // Para botones primarios, usamos color oscurecido si es necesario
        // para garantizar 4.5:1 con texto blanco
        const primaryBg = ensureContrastWithWhite(theme.primaryColor);
        return {
          backgroundColor: primaryBg,
          color: '#FFFFFF',
          boxShadow: `0 10px 15px -3px ${primaryBg}30`,
        };
      case 'secondary':
        // Para botones secondary, usamos color ajustado para garantizar 4.5:1
        // con texto oscuro. Si el secondary es muy claro, lo oscurecemos un poco.
        const secondaryBg = ensureContrastWithDark(theme.secondaryColor);
        return {
          backgroundColor: secondaryBg,
          color: '#1E293B',
          boxShadow: `0 4px 6px -1px ${secondaryBg}40`,
        };
      case 'outline':
        // Outline: fondo transparente con borde del color primario
        // El texto SIEMPRE usa color oscuro (#1E293B) para garantizar contraste
        // 4.5:1 contra fondos claros (que es el 99% de los fondos en EventHub)
        // NO usamos getContrastColor porque está diseñado para el color primario como fondo,
        // no para fondos transparentes o custom (como corkboard con textura)
        return {
          backgroundColor: 'transparent',
          border: `2px solid ${theme.primaryColor}`,
          color: '#1E293B', // Siempre oscuro para contraste contra fondo claro
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
