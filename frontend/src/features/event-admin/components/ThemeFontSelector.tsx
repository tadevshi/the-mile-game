interface ThemeFontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  previewText?: string;
}

// Available Google Fonts
const availableFonts = [
  { name: 'Great Vibes', category: 'cursive' },
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Cinzel', category: 'serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Fredoka One', category: 'display' },
  { name: 'Bubblegum Sans', category: 'cursive' },
  { name: 'Comic Neue', category: 'cursive' },
  { name: 'Source Sans Pro', category: 'sans-serif' },
];

export function ThemeFontSelector({ label, value, onChange, previewText = 'Aa' }: ThemeFontSelectorProps) {
  const selectedFont = availableFonts.find(f => f.name === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-white"
      >
        <option value="">Select a font...</option>
        {availableFonts.map((font) => (
          <option key={font.name} value={font.name}>
            {font.name} ({font.category})
          </option>
        ))}
      </select>

      {/* Preview */}
      {value && (
        <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div 
            className="text-2xl text-center"
            style={{ fontFamily: `'${value}', ${selectedFont?.category || 'sans-serif'}` }}
          >
            {previewText}
          </div>
          <div className="text-center text-xs text-slate-400 mt-1">
            {value}
          </div>
        </div>
      )}
    </div>
  );
}
