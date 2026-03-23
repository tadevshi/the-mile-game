import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useTheme } from '@/shared/theme/useTheme';

// Extiende las props nativas de input + nuestras custom
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Input component con estilo Material Design
 * - Borde inferior que cambia de color con focus
 * - Usa colores del tema para contraste WCAG 4.5:1
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const { currentTheme: theme } = useTheme();

    // Colores del tema para el input
    const borderColor = error
      ? 'var(--color-error, #EF4444)'
      : 'var(--color-secondary, #FBCFE8)';
    const focusBorderColor = 'var(--color-accent, #DB2777)';
    const textColor = 'var(--color-text)';
    const mutedTextColor = 'var(--color-on-surface-muted, var(--color-text))';

    return (
      <div className="flex flex-col w-full">
        {/* Label opcional */}
        {label && (
          <label
            className="font-serif italic text-lg mb-1"
            style={{ color: textColor }}
          >
            {label}
          </label>
        )}

        {/* Input estilo Material: solo borde inferior */}
        <input
          ref={ref}
          type="text"
          className={`
            bg-transparent border-0 border-b-2
            focus:outline-none focus:ring-0
            py-2 px-0
            transition-colors duration-200
            ${className}
          `}
          style={{
            borderColor: error ? 'var(--color-error, #EF4444)' : borderColor,
            borderBottomColor: error ? 'var(--color-error, #EF4444)' : borderColor,
          }}
          onFocus={(e) => {
            e.target.style.borderBottomColor = focusBorderColor;
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = error
              ? 'var(--color-error, #EF4444)'
              : borderColor;
          }}
          placeholder="..."
          {...props}
        />

        {/* Placeholder inline style para contraste */}
        <style>{`
          input::placeholder {
            color: ${theme.secondaryColor}80;
            opacity: 0.8;
          }
        `}</style>

        {/* Texto de ayuda o error */}
        {(helperText || error) && (
          <span
            className="text-xs mt-1"
            style={{ color: error ? 'var(--color-error, #EF4444)' : mutedTextColor }}
          >
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

// Necesario para que React DevTools muestre el nombre correcto
Input.displayName = 'Input';
