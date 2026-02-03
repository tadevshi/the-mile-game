import { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  score: number;
  isActive: boolean;
}

export function ConfettiEffect({ score, isActive }: ConfettiProps) {
  const triggerConfetti = useCallback(() => {
    // Configuración base
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 100,
    };

    if (score >= 10) {
      // Puntaje alto: Confetti ESPECTACULAR
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          ...defaults,
          particleCount: 5,
          angle: 60,
          spread: 55,
          colors: ['#f9a8d4', '#fbcfe8', '#db2777', '#ffd700', '#ffffff'],
          shapes: ['circle', 'square'],
          scalar: 1.2,
        });
        confetti({
          ...defaults,
          particleCount: 5,
          angle: 120,
          spread: 55,
          colors: ['#f9a8d4', '#fbcfe8', '#db2777', '#ffd700', '#ffffff'],
          shapes: ['circle', 'square'],
          scalar: 1.2,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Explosión adicional de celebración
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 100,
          spread: 100,
          colors: ['#f9a8d4', '#db2777', '#ffd700'],
          shapes: ['circle'],
          scalar: 2,
          drift: 0,
        });
      }, 500);

    } else if (score >= 7) {
      // Puntaje medio-alto: Confetti moderado
      confetti({
        ...defaults,
        particleCount: 80,
        spread: 70,
        colors: ['#f9a8d4', '#fbcfe8', '#db2777', '#ffffff'],
        shapes: ['circle', 'square'],
        scalar: 1,
      });

      // Segunda ronda
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 50,
          spread: 60,
          colors: ['#f9a8d4', '#db2777'],
          shapes: ['circle'],
        });
      }, 300);

    } else if (score >= 4) {
      // Puntaje medio: Confetti simple
      confetti({
        ...defaults,
        particleCount: 50,
        spread: 60,
        colors: ['#f9a8d4', '#fbcfe8', '#ffffff'],
        shapes: ['circle'],
        scalar: 0.8,
      });

    } else {
      // Puntaje bajo: Confetti mínimo pero animado
      confetti({
        ...defaults,
        particleCount: 30,
        spread: 50,
        colors: ['#f9a8d4', '#ffffff'],
        shapes: ['circle'],
        scalar: 0.6,
      });
    }
  }, [score]);

  useEffect(() => {
    if (isActive) {
      // Pequeño delay para que la página termine de cargar
      const timer = setTimeout(triggerConfetti, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, triggerConfetti]);

  return null; // Este componente no renderiza nada visible
}

// Función helper para disparar confetti manualmente
export const fireConfetti = (options?: confetti.Options) => {
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 100,
    colors: ['#f9a8d4', '#fbcfe8', '#db2777', '#ffd700', '#ffffff'],
  };

  confetti({
    ...defaults,
    particleCount: 60,
    spread: 70,
    ...options,
  });
};
