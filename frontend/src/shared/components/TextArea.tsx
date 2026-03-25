import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = '', rows = 3, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label 
            className="font-serif italic text-lg mb-2"
            style={{ color: 'var(--color-on-background)' }}
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full 
            bg-transparent
            border ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}
            rounded-[var(--radius-lg)] p-4 
            focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30
            transition-all duration-200
            resize-none
            ${className}
          `}
          style={{
            color: 'var(--color-on-background)',
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          }}
          {...props}
        />
        
        {(helperText || error) && (
          <span 
            className="text-xs mt-1"
            style={{ color: error ? 'var(--color-error)' : 'var(--color-on-surface-muted)' }}
          >
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
