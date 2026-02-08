import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

// Componente Mariposa con orientación realista
function Butterfly({ 
  delay, 
  duration, 
  size, 
  startX, 
  startY,
  color = '#FBCFE8'
}: { 
  delay: number; 
  duration: number; 
  size: number; 
  startX: string;
  startY: string;
  color?: string;
}) {
  const prevPos = useRef({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  // Trayectoria suave en forma de "8" o serpentina
  const pathX = [0, 60, 120, 80, 40, 0, -40, -80, -40, 0];
  const pathY = [0, -40, -20, -60, -30, -50, -30, -10, -40, 0];

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: startX, 
        top: startY,
        width: size,
        height: size,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      <motion.div
        animate={{
          x: pathX,
          y: pathY,
        }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        onUpdate={(latest) => {
          const currentX = (latest as { x: number }).x || 0;
          const currentY = (latest as { y: number }).y || 0;
          const dx = currentX - prevPos.current.x;
          const dy = currentY - prevPos.current.y;
          
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            // Calcular ángulo de movimiento y sumar 90° (la mariposa mira hacia arriba)
            const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            setRotation(angle);
            prevPos.current = { x: currentX, y: currentY };
          }
        }}
        style={{ rotate: rotation }}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Ala superior izquierda */}
          <path
            d="M32 36C32 36 28 24 20 20C12 16 6 22 6 30C6 38 14 42 20 40C26 38 32 36 32 36Z"
            fill={color}
            fillOpacity="0.7"
          />
          {/* Ala inferior izquierda */}
          <path
            d="M32 36C32 36 28 46 24 52C20 58 14 60 10 56C6 52 8 44 14 42C20 40 32 36 32 36Z"
            fill={color}
            fillOpacity="0.5"
          />
          {/* Ala superior derecha */}
          <path
            d="M32 36C32 36 36 24 44 20C52 16 58 22 58 30C58 38 50 42 44 40C38 38 32 36 32 36Z"
            fill={color}
            fillOpacity="0.7"
          />
          {/* Ala inferior derecha */}
          <path
            d="M32 36C32 36 36 46 40 52C44 58 50 60 54 56C58 52 56 44 50 42C44 40 32 36 32 36Z"
            fill={color}
            fillOpacity="0.5"
          />
          {/* Cuerpo */}
          <ellipse cx="32" cy="36" rx="2" ry="12" fill={color} fillOpacity="0.8" />
          {/* Antenas */}
          <path d="M30 26C28 20 24 18 24 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M34 26C36 20 40 18 40 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// Componente Partícula flotante
function FloatingParticle({
  delay,
  duration,
  size,
  startX,
  startY,
}: {
  delay: number;
  duration: number;
  size: number;
  startX: string;
  startY: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full bg-gradient-to-br from-primary/30 to-accent/30 pointer-events-none"
      style={{
        left: startX,
        top: startY,
        width: size,
        height: size,
      }}
      animate={{
        y: [0, -30, 0, -20, 0],
        x: [0, 15, -10, 20, 0],
        opacity: [0.3, 0.7, 0.4, 0.8, 0.3],
        scale: [1, 1.2, 0.9, 1.1, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Componente Sparkle brillante
function Sparkle({
  delay,
  duration,
  size,
  startX,
  startY,
}: {
  delay: number;
  duration: number;
  size: number;
  startX: string;
  startY: string;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: startX,
        top: startY,
        width: size,
        height: size,
      }}
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 4,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
          fill="#FFD700"
          fillOpacity="0.6"
        />
      </svg>
    </motion.div>
  );
}

// Background animado completo
export function ButterflyBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Generar mariposas con posiciones aleatorias
  const butterflies = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.8,
    duration: 12 + Math.random() * 8,
    size: 24 + Math.random() * 16,
    startX: `${10 + Math.random() * 80}%`,
    startY: `${60 + Math.random() * 30}%`,
    color: ['#FBCFE8', '#F9A8D4', '#F48FB1', '#FBBF24'][Math.floor(Math.random() * 4)],
  }));

  // Generar partículas
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 6,
    size: 4 + Math.random() * 8,
    startX: `${Math.random() * 100}%`,
    startY: `${Math.random() * 100}%`,
  }));

  // Generar sparkles
  const sparkles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    size: 8 + Math.random() * 8,
    startX: `${20 + Math.random() * 60}%`,
    startY: `${20 + Math.random() * 60}%`,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Capa de gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 via-white/30 to-pink-100/40 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/40" />

      {/* Mariposas animadas */}
      {butterflies.map((b) => (
        <Butterfly key={b.id} {...b} />
      ))}

      {/* Partículas flotantes */}
      {particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* Sparkles brillantes */}
      {sparkles.map((s) => (
        <Sparkle key={s.id} {...s} />
      ))}

      {/* Círculos decorativos difuminados */}
      <motion.div
        className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
