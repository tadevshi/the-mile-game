// SVG Push Pin — simula un pin clavado en la cartelera de corcho
// Centrado en la parte superior de cada postal

interface PushPinProps {
  className?: string;
}

export function PushPin({ className = '' }: PushPinProps) {
  return (
    <svg
      width="24"
      height="32"
      viewBox="0 0 24 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-md ${className}`}
      aria-hidden="true"
    >
      {/* Aguja */}
      <line
        x1="12"
        y1="22"
        x2="12"
        y2="32"
        stroke="#888"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Cabeza del pin — degradado metálico */}
      <circle cx="12" cy="12" r="10" fill="url(#pinGradient)" />
      {/* Brillo */}
      <circle cx="9" cy="9" r="4" fill="rgba(255,255,255,0.4)" />
      {/* Borde sutil */}
      <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
      <defs>
        <radialGradient id="pinGradient" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#FF6B8A" />
          <stop offset="60%" stopColor="#E91E63" />
          <stop offset="100%" stopColor="#AD1457" />
        </radialGradient>
      </defs>
    </svg>
  );
}
