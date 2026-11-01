import { useState } from 'react';

interface ThemeColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ThemeColorPicker({ label, value, onChange }: ThemeColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Preset color options
  const presetColors = [
    '#EC4899', '#F472B6', '#FBCFE8', // Pinks
    '#8B5CF6', '#A78BFA', '#DDD6FE', // Purples
    '#3B82F6', '#60A5FA', '#BFDBFE', // Blues
    '#10B981', '#34D399', '#A7F3D0', // Greens
    '#F59E0B', '#FBBF24', '#FDE68A', // Yellows/Oranges
    '#EF4444', '#F87171', '#FECACA', // Reds
    '#06B6D4', '#22D3EE', '#A5F3FC', // Cyans
    '#1E293B', '#64748B', '#94A3B8', // Grays
    '#FFFFFF', '#F8FAFC', '#F1F5F9', // Whites
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      
      <div className="flex items-center gap-3">
        {/* Color preview */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-lg border-2 border-slate-200 shadow-sm hover:scale-105 transition-transform"
          style={{ backgroundColor: value }}
          title="Click to toggle color picker"
        />
        
        {/* Hex input */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">#</span>
          <input
            type="text"
            value={value.replace('#', '')}
            onChange={(e) => onChange(`#${e.target.value}`)}
            className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg uppercase font-mono text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            maxLength={6}
            pattern="[0-9A-Fa-f]{6}"
          />
        </div>
        
        {/* Native color input (hidden but functional) */}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
        />
      </div>

      {/* Color preset grid */}
      {isOpen && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-8 gap-1">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className={`
                  w-6 h-6 rounded border-2 transition-all
                  ${value === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-110'}
                `}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
