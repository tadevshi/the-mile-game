import { motion } from 'framer-motion';

interface FeatureToggleProps {
  name: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle switch para feature flags.
 * Follows the pastel/glassmorphism design system.
 */
export function FeatureToggle({
  name,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: FeatureToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      className={`
        flex items-start justify-between gap-4 p-4 
        bg-white/60 backdrop-blur-sm rounded-xl 
        border border-pink-100 
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/80 cursor-pointer'}
      `}
      onClick={disabled ? undefined : handleToggle}
    >
      <div className="flex-1 min-w-0">
        <label
          htmlFor={name}
          className="block font-medium text-gray-800 text-sm md:text-base cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs md:text-sm text-gray-500">{description}</p>
        )}
      </div>

      <button
        type="button"
        id={name}
        name={name}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={disabled ? undefined : handleToggle}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full 
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2
          ${checked ? 'bg-pink-500' : 'bg-gray-200'}
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full 
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
