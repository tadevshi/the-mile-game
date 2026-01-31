interface HeaderProps {
  title: string;
  subtitle?: string;
  decoration?: 'lines' | 'dots' | 'none';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
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
}: HeaderProps) {
  const alignClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div className={`flex flex-col ${alignClasses[align]} space-y-2`}>
      {/* Título principal */}
      <h1 className={`font-display ${sizeStyles[size]} text-accent dark:text-primary drop-shadow-sm`}>
        {title}
      </h1>

      {/* Subtítulo con decoración */}
      {subtitle && (
        <div className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
          {decoration === 'lines' && <span className="h-[1px] w-8 bg-primary/30" />}
          
          {decoration === 'dots' && (
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-primary/40" />
              <div className="w-1 h-1 rounded-full bg-primary/60" />
            </div>
          )}

          <p className="text-gray-500 dark:text-gray-400 font-light tracking-[0.2em] uppercase text-[10px]">
            {subtitle}
          </p>

          {decoration === 'lines' && <span className="h-[1px] w-8 bg-primary/30" />}
          
          {decoration === 'dots' && (
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-primary/60" />
              <div className="w-1 h-1 rounded-full bg-primary/40" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
