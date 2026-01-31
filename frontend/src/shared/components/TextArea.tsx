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
          <label className="font-serif italic text-lg mb-2 text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full 
            bg-white/50 dark:bg-black/20 
            border ${error ? 'border-red-500' : 'border-primary/30'}
            rounded-2xl p-4 
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
            placeholder:text-pink-200 dark:placeholder:text-pink-800
            transition-all duration-200
            text-slate-800 dark:text-slate-100
            resize-none
            ${className}
          `}
          {...props}
        />
        
        {(helperText || error) && (
          <span className={`text-xs mt-1 ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
