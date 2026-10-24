import type { PostcardStyle } from '@/shared/lib/api';

interface PostcardStyleSelectorProps {
  value: PostcardStyle;
  onChange: (style: PostcardStyle) => void;
}

const options: Array<{ value: PostcardStyle; label: string; description: string }> = [
  {
    value: 'classic',
    label: 'Clásica',
    description: 'Diseño de postal con foto y mensaje lado a lado.',
  },
  {
    value: 'polaroid',
    label: 'Polaroid',
    description: 'Foto enmarcada con dedicatoria manuscrita debajo.',
  },
];

function StylePreview({ style }: { style: PostcardStyle }) {
  if (style === 'polaroid') {
    return (
      <svg viewBox="0 0 96 72" role="img" aria-label="Vista previa de postal Polaroid" className="h-16 w-20">
        <rect x="18" y="4" width="60" height="64" rx="2" fill="#fffdf8" stroke="#d6d3d1" />
        <rect x="24" y="10" width="48" height="38" fill="#fbcfe8" />
        <path d="M27 43 39 29l9 9 8-7 13 12" fill="none" stroke="#db2777" strokeWidth="2" />
        <path d="M29 57c9-4 18 4 36-2" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 72" role="img" aria-label="Vista previa de postal Clásica" className="h-16 w-20">
      <rect x="6" y="12" width="84" height="48" rx="3" fill="#fff" stroke="#d6d3d1" />
      <rect x="10" y="16" width="37" height="40" fill="#fbcfe8" />
      <path d="M13 51 23 35l8 8 7-6 6 14" fill="none" stroke="#db2777" strokeWidth="2" />
      <path d="M54 27h27M54 35h27M54 43h20" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PostcardStyleSelector({ value, onChange }: PostcardStyleSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold uppercase tracking-wider text-slate-600">
        Estilo de las postales
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
                selected ? 'border-pink-500 bg-pink-50' : 'border-slate-200 bg-white hover:border-pink-200'
              }`}
            >
              <input
                type="radio"
                name="postcard-style"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 accent-pink-600"
              />
              <StylePreview style={option.value} />
              <span className="min-w-0">
                <span className="block font-semibold text-slate-800">{option.label}</span>
                <span className="block text-xs leading-relaxed text-slate-600">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
