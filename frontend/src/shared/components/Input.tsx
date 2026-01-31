import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

// Extiende las props nativas de input + nuestras custom
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// forwardRef permite que el padre acceda al DOM del input (necesario para form libraries)
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {/* Label opcional */}
        {label && (
          <label className="font-serif italic text-lg mb-1 text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        
        {/* Input estilo Material: solo borde inferior */}
        <input
          ref={ref}
          className={`
            bg-transparent border-0 border-b-2 
            ${error ? 'border-red-500' : 'border-primary/50 focus:border-accent'}
            py-2 px-0 
            focus:outline-none focus:ring-0
            placeholder:text-pink-200 dark:placeholder:text-pink-900
            transition-colors duration-200
            text-slate-800 dark:text-slate-100
            ${className}
          `}
          {...props}
        />
        
        {/* Texto de ayuda o error */}
        {(helperText || error) && (
          <span className={`text-xs mt-1 ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

// Necesario para que React DevTools muestre el nombre correcto
Input.displayName = 'Input';
