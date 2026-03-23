import { useTheme } from '@/shared/theme/useTheme';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Switch({ checked, onChange, disabled = false, 'aria-label': ariaLabel }: SwitchProps) {
  const { currentTheme: theme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{
        backgroundColor: checked ? theme.primaryColor : 'rgba(156, 163, 175, 0.4)',
        outline: `2px solid ${theme.primaryColor}40`,
        outlineOffset: '2px',
      }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
        style={{
          boxShadow: checked
            ? `0 2px 4px ${theme.primaryColor}40`
            : '0 2px 4px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}
