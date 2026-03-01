import { useState, useCallback } from 'react';
import { toCanvas } from 'html-to-image';

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
 * - Toca el sonido del obturador
 * - Captura el viewport actual (no toda la página — solo lo visible)
 * - Excluye el overlay del flash del capture
 * - Retorna `isFlashing` para que el componente renderice el efecto visual
 */
export function useCorkboardCapture() {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const downloadCorkboard = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    // Sonido y flash arrancan juntos
    playShutterSound();
    setIsFlashing(true);

    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      // Capturar el documento completo excluyendo el overlay del flash
      const fullCanvas = await toCanvas(document.documentElement, {
        useCORS: true,
        pixelRatio,
        filter: (node: Node) => {
          if (node instanceof Element) {
            return !node.classList.contains('camera-flash-overlay');
          }
          return true;
        },
      });

      // Recortar al viewport actual (lo que el usuario ve en pantalla)
      const viewportCanvas = document.createElement('canvas');
      viewportCanvas.width = window.innerWidth * pixelRatio;
      viewportCanvas.height = window.innerHeight * pixelRatio;

      const ctx2d = viewportCanvas.getContext('2d');
      if (ctx2d) {
        ctx2d.drawImage(
          fullCanvas,
          window.scrollX * pixelRatio,   // fuente: desplazamiento X del scroll
          window.scrollY * pixelRatio,   // fuente: desplazamiento Y del scroll
          window.innerWidth * pixelRatio,
          window.innerHeight * pixelRatio,
          0, 0,
          window.innerWidth * pixelRatio,
          window.innerHeight * pixelRatio,
        );
      }

      const dataUrl = viewportCanvas.toDataURL('image/png');

      // Disparar la descarga luego de 350ms — en el pico del flash
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = 'cartelera-de-mile.png';
        link.href = dataUrl;
        link.click();
      }, 350);

    } catch (err) {
      console.error('[CorkboardCapture] Error al capturar:', err);
    } finally {
      // El flash dura 700ms — reseteamos después de eso
      setTimeout(() => {
        setIsFlashing(false);
        setIsCapturing(false);
      }, 750);
    }
  }, [isCapturing]);

  return { isFlashing, isCapturing, downloadCorkboard };
}
