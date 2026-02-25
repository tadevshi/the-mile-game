import { useDescriptions } from '../hooks/useDescriptions';
import { StampItem } from './StampItem';
import type { StampPosition } from './StampItem';

// ─── Assets ──────────────────────────────────────────────────────────────────
// Las imágenes viven en /public/stamps/ → se sirven como assets estáticos
const STAMP_IMAGES = [
  '/stamps/stamp_naranjo_en_flor.jpg',
  '/stamps/stamp_sueno_triunfo.jpg',
  '/stamps/stamp_cafe_medialunas.jpg',
  '/stamps/stamp_valentine_cupcake.jpg',
  '/stamps/stamp_valentine_key_lock.jpg',
  '/stamps/stamp_valentine_coffee.jpg',
  '/stamps/stamp_valentine_bottle.jpg',
  '/stamps/stamp_mexico_sheet.jpg',
];

// ─── Posiciones fijas para desktop / proyección ───────────────────────────────
// Distribuidas en ambos márgenes verticales: 4 en columna izquierda + 4 derecha.
// Con rotaciones determinísticas para dar el efecto "tirado" sin regenerarse.
const STAMP_POSITIONS: StampPosition[] = [
  // Columna izquierda → se expanden hacia la derecha
  { top: '10%', left: '0.5%',  rotation: -12, expandDirection: 'right' },
  { top: '30%', left: '1%',    rotation:   8, expandDirection: 'right' },
  { top: '54%', left: '0.5%',  rotation:  -5, expandDirection: 'right' },
  { top: '76%', left: '2%',    rotation:  14, expandDirection: 'right' },
  // Columna derecha → se expanden hacia la izquierda
  { top:  '8%', right: '0.5%', rotation:  10, expandDirection: 'left'  },
  { top: '32%', right: '1%',   rotation:  -9, expandDirection: 'left'  },
  { top: '56%', right: '0.5%', rotation:   7, expandDirection: 'left'  },
  { top: '78%', right: '2%',   rotation: -15, expandDirection: 'left'  },
];

/**
 * Capa de estampillas decorativas sobre el corkboard.
 *
 * - z-index: 2  → siempre detrás de las postcards (z-10) y del header
 * - Cada estampilla muestra una descripción anónima al hacer click
 * - Solo se renderiza si hay al menos una descripción disponible
 * - Pensada para desktop / proyección, no optimizada para mobile
 */
export function StampLayer() {
  const { descriptions, isLoading } = useDescriptions();

  // Sin datos aún o cargando → no renderizar nada para evitar flicker
  if (isLoading || descriptions.length === 0) return null;

  return (
    <>
      {descriptions.map((description, index) => (
        <StampItem
          key={index}
          image={STAMP_IMAGES[index % STAMP_IMAGES.length]}
          description={description}
          position={STAMP_POSITIONS[index % STAMP_POSITIONS.length]}
          index={index}
        />
      ))}
    </>
  );
}
