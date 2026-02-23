import { useRef } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { PushPin } from './PushPin';
import type { Postcard } from '../types/postcards.types';

interface PostcardCardProps {
  postcard: Postcard;
  onSelect: (postcard: Postcard) => void;
}

export function PostcardCard({ postcard, onSelect }: PostcardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative pt-4">
      {/* Push pin centrado arriba — z-40 para estar SIEMPRE encima de la postal (hover usa z-30) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <PushPin />
      </div>

      {/* Postal con rotación */}
      <motion.div
        ref={cardRef}
        className="postcard-card relative bg-white shadow-lg cursor-pointer overflow-hidden border border-gray-200"
        style={{ rotate: postcard.rotation }}
        whileHover={{ scale: 1.05, zIndex: 30, rotate: 0 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelect(postcard)}
        layout
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Layout postal: foto izquierda, mensaje derecha */}
        {/* Usamos aspect ratio fijo para que siempre mantenga proporción de postal */}
        <div className="flex w-full aspect-[2/1] max-h-[220px]">
          {/* Foto — lado izquierdo */}
          <div className="w-1/2 relative overflow-hidden bg-gray-100">
            <img
              src={postcard.image_path}
              alt={`Postal de ${postcard.player_name}`}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Separador vertical */}
          <div className="w-px bg-gray-200 self-stretch" />

          {/* Mensaje — lado derecho */}
          <div className="w-1/2 p-3 flex flex-col justify-between relative">
            {/* Líneas decorativas de fondo (efecto postal real) */}
            <div className="absolute inset-x-3 top-8 space-y-4 pointer-events-none">
              <div className="h-px bg-gray-100" />
              <div className="h-px bg-gray-100" />
              <div className="h-px bg-gray-100" />
              <div className="h-px bg-gray-100" />
            </div>

            <div className="relative z-10">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">
                mensaje:
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 font-serif italic">
                {postcard.message || '...'}
              </p>
            </div>

            {/* From: nombre */}
            <div className="relative z-10 mt-2 pt-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <span className="text-sm">{postcard.player_avatar}</span>
                <span className="font-medium text-accent">
                  {postcard.player_name}
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Utilidad para descargar una postal como PNG
export async function downloadPostcardAsPng(
  element: HTMLElement,
  playerName: string
) {
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = `postal-${playerName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Error downloading postcard:', err);
  }
}
