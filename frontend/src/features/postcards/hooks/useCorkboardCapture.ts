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
        const envelope = Math.exp(-t * 35);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = ctx.createBufferSource();
      source.buffer = buf;

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
    createClick(now,        0.028, 1800, 0.55);
    createClick(now + 0.09, 0.022, 2200, 0.40);

    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Web Audio API no soportada — silencio
  }
}

/** Convierte un data URL a Blob sin pasar por fetch (más confiable). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Hook para capturar el corkboard como imagen PNG y descargarlo.
 *
 * Estrategia de descarga:
 * 1. Mobile → navigator.share() (share sheet nativo: guardar en fotos, WhatsApp, etc.)
 * 2. Desktop → blob URL + <a download> click
 * 3. Fallback → window.open con la imagen
 *
 * Los errores se muestran al usuario (no se tragan silenciosamente).
 */
export function useCorkboardCapture(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const downloadCorkboard = useCallback(async () => {
    if (isCapturing || !containerRef.current) return;
    setIsCapturing(true);
    setCaptureError(null);

    playShutterSound();
    setIsFlashing(true);

    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        pixelRatio,
        filter: (node: HTMLElement) => !node.classList?.contains('camera-flash-overlay'),
      });

      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], 'cartelera-de-mile.png', { type: 'image/png' });

      // Mobile: share sheet nativo (guardar en fotos, mandar por WA, etc.)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }

      // Desktop: blob URL + <a download>
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'cartelera-de-mile.png';
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[CorkboardCapture] Error:', msg);
      setCaptureError(msg);
    } finally {
      setTimeout(() => {
        setIsFlashing(false);
        setIsCapturing(false);
      }, 700);
    }
  }, [isCapturing, containerRef]);

  return { isFlashing, isCapturing, captureError, downloadCorkboard };
}
