import { useTheme } from '@/shared/theme/useTheme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  decoration?: 'lines' | 'dots' | 'none';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
  /** Override primary color from theme */
  primaryColor?: string;
}

const sizeStyles = {
  sm: 'text-3xl',
  md: 'text-5xl',
  lg: 'text-6xl md:text-7xl',
};

export function Header({
  title,
  subtitle,
  decoration = 'lines',
  size = 'lg',
  align = 'center',
  primaryColor,
}: HeaderProps) {
  const { currentTheme: theme } = useTheme();
  
  // Use provided color or fall back to theme's accent or primary
  const displayPrimaryColor = primaryColor || theme.accentColor || theme.primaryColor;
  const textColor = theme.textColor;

  const alignClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div className={`flex flex-col ${alignClasses[align]} space-y-2`}>
      {/* Título principal */}
      <h1 
        className={`font-display ${sizeStyles[size]} drop-shadow-sm`}
        style={{ color: displayPrimaryColor }}
      >
        {title}
      </h1>

      {/* Subtítulo con decoración */}
      {subtitle && (
        <div className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
          {decoration === 'lines' && (
            <span 
              className="h-[1px] w-8" 
              style={{ backgroundColor: `${displayPrimaryColor}30` }} 
            />
          )}
          
          {decoration === 'dots' && (
            <div className="flex gap-1">
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: `${displayPrimaryColor}40` }} 
              />
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: `${displayPrimaryColor}60` }} 
              />
            </div>
          )}

          <p 
            className="font-light tracking-[0.2em] uppercase text-[10px]"
            style={{ color: textColor }}
          >
            {subtitle}
          </p>

          {decoration === 'lines' && (
            <span 
              className="h-[1px] w-8" 
              style={{ backgroundColor: `${displayPrimaryColor}30` }} 
            />
          )}
          
          {decoration === 'dots' && (
            <div className="flex gap-1">
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: `${displayPrimaryColor}60` }} 
              />
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: `${displayPrimaryColor}40` }} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
