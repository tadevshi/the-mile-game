import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

// Extiende las props nativas de input + nuestras custom
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Input component con estilo Material Design
 * - Borde inferior que cambia de color con focus
 * - Usa CSS variables del tema para contraste WCAG 4.5:1
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    // Input styles use CSS variables directly

    // Colores del tema usando CSS variables
    const borderColor = error
      ? 'var(--color-error)'
      : 'var(--color-border)';
    const focusBorderColor = 'var(--color-primary)';
    const textColor = 'var(--color-on-background)';
    const mutedTextColor = 'var(--color-on-surface-muted)';

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
            borderColor: error ? 'var(--color-error)' : borderColor,
            borderBottomColor: error ? 'var(--color-error)' : borderColor,
            color: textColor,
          }}
          onFocus={(e) => {
            e.target.style.borderBottomColor = focusBorderColor;
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = error
              ? 'var(--color-error)'
              : borderColor;
          }}
          placeholder="..."
          {...props}
        />

        {/* Placeholder inline style para contraste */}
        <style>{`
          input::placeholder {
            color: var(--color-on-surface-muted);
            opacity: 0.8;
          }
        `}</style>

        {/* Texto de ayuda o error */}
        {(helperText || error) && (
          <span
            className="text-xs mt-1"
            style={{ color: error ? 'var(--color-error)' : mutedTextColor }}
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
