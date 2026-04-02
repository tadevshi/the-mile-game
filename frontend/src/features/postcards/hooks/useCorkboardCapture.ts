import { useState, useCallback, useRef, type RefObject } from 'react';
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
 *
 * Para el export:
 * - Los elementos marcados con `data-export-hide="true"` son excluidos (botones de UI).
 * - Los elementos marcados con `data-cork-bg` y `data-cork-vignette` se cambian
 *   temporalmente de `fixed` a `absolute` con altura = scrollHeight, para que el
 *   fondo de corcho cubra todo el contenido aunque las postales excedan el viewport.
 */
export function useCorkboardCapture(containerRef: RefObject<HTMLDivElement | null>, fileName = 'cartelera-evento.png') {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Ref para el guard de "en progreso" — evita que `isCapturing` en los deps
  // de useCallback genere una nueva referencia de función en cada render.
  const isCapturingRef = useRef(false);

  const downloadCorkboard = useCallback(async () => {
    if (isCapturingRef.current || !containerRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    setCaptureError(null);

    playShutterSound();
    setIsFlashing(true);

    const container = containerRef.current;

    // ── Preparar background para el export ────────────────────────────────
    // El fondo usa `position: fixed`, así que html-to-image solo lo captura
    // con altura = viewport. Lo cambiamos temporalmente a `absolute` con la
    // altura total del contenido para que el corcho cubra todas las postales.
    const bgDiv = container.querySelector('[data-cork-bg]') as HTMLElement | null;
    const vignetteDiv = container.querySelector('[data-cork-vignette]') as HTMLElement | null;

    // Guardamos el string completo del atributo style para restaurarlo exactamente
    const bgStyleBefore = bgDiv?.getAttribute('style') ?? null;
    const vignetteStyleBefore = vignetteDiv?.getAttribute('style') ?? null;

    const fullHeight = container.scrollHeight;

    if (bgDiv) {
      bgDiv.style.position = 'absolute';
      bgDiv.style.top = '0';
      bgDiv.style.left = '0';
      bgDiv.style.right = '0';
      bgDiv.style.bottom = 'auto';
      bgDiv.style.height = `${fullHeight}px`;
      bgDiv.style.backgroundSize = 'cover';
      bgDiv.style.backgroundPosition = 'top center';
    }

    if (vignetteDiv) {
      vignetteDiv.style.position = 'absolute';
      vignetteDiv.style.top = '0';
      vignetteDiv.style.left = '0';
      vignetteDiv.style.right = '0';
      vignetteDiv.style.bottom = 'auto';
      vignetteDiv.style.height = `${fullHeight}px`;
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      const dataUrl = await toPng(container, {
        cacheBust: true,
        pixelRatio,
        // Al pasar string vacío, html-to-image simplemente dibuja un rectángulo transparente
        // cuando una imagen falla, en lugar de crashear el proceso entero con error
        imagePlaceholder: '',
        filter: (node: HTMLElement) => {
          // Excluir el flash de cámara
          if (node.classList?.contains('camera-flash-overlay')) return false;
          // Excluir los botones de UI marcados para el export
          if (typeof node.getAttribute === 'function' && node.getAttribute('data-export-hide') === 'true') return false;
          return true;
        },
      });

      const blob = dataUrlToBlob(dataUrl);
      const blobUrl = URL.createObjectURL(blob);

      // Descargamos directamente via anchor click (funciona en mobile y desktop)
      // Evitamos navigator.share porque el proceso asíncrono de toPng es muy largo
      // y rompe el "user gesture requirement" de la Web Share API
      const link = document.createElement('a');
      link.download = fileName;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[CorkboardCapture] Error:', msg);
      setCaptureError(msg);
      // Auto-dismiss del error toast después de 4 segundos
      setTimeout(() => setCaptureError(null), 4000);
    } finally {
      // ── Restaurar estilos originales ───────────────────────────────────
      if (bgDiv) {
        if (bgStyleBefore !== null) {
          bgDiv.setAttribute('style', bgStyleBefore);
        } else {
          bgDiv.removeAttribute('style');
        }
      }
      if (vignetteDiv) {
        if (vignetteStyleBefore !== null) {
          vignetteDiv.setAttribute('style', vignetteStyleBefore);
        } else {
          vignetteDiv.removeAttribute('style');
        }
      }
      // ──────────────────────────────────────────────────────────────────

      setTimeout(() => {
        setIsFlashing(false);
        setIsCapturing(false);
        isCapturingRef.current = false;
      }, 700);
    }
  }, [containerRef, fileName]);

  return { isFlashing, isCapturing, captureError, downloadCorkboard };
}
