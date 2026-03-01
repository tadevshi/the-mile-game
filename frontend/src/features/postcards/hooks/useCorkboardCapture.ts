import { useState, useCallback, type RefObject } from 'react';
import { toPng } from 'html-to-image';

/**
 * Sintetiza el sonido característico de un obturador de cámara usando Web Audio API.
 * Dos clicks breves (apertura + cierre del obturador) sin necesidad de archivo de audio.
 */
function playShutterSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    /** Genera un click corto filtrado — simula el mecanismo del obturador */
    function createClick(startTime: number, durationSec: number, highpassFreq: number, volume: number) {
      const bufLen = Math.floor(ctx.sampleRate * durationSec);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);

      for (let i = 0; i < bufLen; i++) {
        const t = i / bufLen;
        // Decaimiento exponencial rápido — el obturador es mecánico, no resuena
        const envelope = Math.exp(-t * 35);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = ctx.createBufferSource();
      source.buffer = buf;

      // Highpass para sacar los graves — el obturador es agudo
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = highpassFreq;
      filter.Q.value = 0.8;

      const gain = ctx.createGain();
      gain.gain.value = volume;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(startTime);
    }

    const now = ctx.currentTime;
    createClick(now,        0.028, 1800, 0.55); // Apertura: click inicial (más fuerte)
    createClick(now + 0.09, 0.022, 2200, 0.40); // Cierre: click secundario (más suave)

    // Cerrar el contexto después de que el sonido termine
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Si el browser no soporta Web Audio API, silenciosamente ignorar
  }
}

/**
 * Hook para capturar el corkboard como imagen PNG y descargarlo.
 *
 * Recibe un ref al contenedor del corkboard para capturarlo directamente
 * (html-to-image no funciona bien sobre document.documentElement).
 *
 * - Toca el sonido del obturador
 * - Captura el nodo referenciado excluyendo el overlay del flash
 * - Descarga el resultado como PNG via blob URL (más confiable que dataURL)
 * - Retorna `isFlashing` para que el componente renderice el efecto visual
 */
export function useCorkboardCapture(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const downloadCorkboard = useCallback(async () => {
    if (isCapturing || !containerRef.current) return;
    setIsCapturing(true);

    // Sonido y flash arrancan juntos
    playShutterSound();
    setIsFlashing(true);

    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      const dataUrl = await toPng(containerRef.current, {
        pixelRatio,
        filter: (node: HTMLElement) => !node.classList?.contains('camera-flash-overlay'),
      });

      // Descarga via blob URL — más confiable que link.href = dataUrl directamente
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = 'cartelera-de-mile.png';
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Liberar la URL del blob después de que el browser la consuma
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    } catch (err) {
      console.error('[CorkboardCapture] Error al capturar:', err);
    } finally {
      // El flash dura 600ms — reseteamos justo después
      setTimeout(() => {
        setIsFlashing(false);
        setIsCapturing(false);
      }, 700);
    }
  }, [isCapturing, containerRef]);

  return { isFlashing, isCapturing, downloadCorkboard };
}
