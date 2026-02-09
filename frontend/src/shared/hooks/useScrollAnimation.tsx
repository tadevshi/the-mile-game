import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

// Variantes predefinidas para scroll animations
export const scrollVariants: Record<string, Variants> = {
  // Fade in desde abajo (más común)
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
  },
  
  // Fade in desde arriba
  fadeDown: {
    hidden: { opacity: 0, y: -30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
  },
  
  // Fade in desde la izquierda
  fadeLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
  },
  
  // Fade in desde la derecha
  fadeRight: {
    hidden: { opacity: 0, x: 30 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
  },
  
  // Scale up (zoom suave)
  scaleUp: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" as const }
    },
  },
  
  // Stagger para grupos de elementos
  stagger: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },
  
  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const }
    },
  },
};

// Componente wrapper para animaciones scroll
interface ScrollRevealProps {
  children: ReactNode;
  variant?: keyof typeof scrollVariants;
  className?: string;
  delay?: number;
  once?: boolean;
  amount?: number;
}

export function ScrollReveal({ 
  children, 
  variant = 'fadeUp', 
  className = '',
  delay = 0,
  once = true,
  amount = 0.2,
}: ScrollRevealProps) {
  const selectedVariant = scrollVariants[variant];
  
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={selectedVariant}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// Componente para grupos con stagger
interface ScrollStaggerProps {
  children: ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
}

export function ScrollStagger({ 
  children, 
  className = '',
  once = true,
  amount = 0.2,
}: ScrollStaggerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={scrollVariants.stagger}
    >
      {children}
    </motion.div>
  );
}

// Item para usar dentro de ScrollStagger
export function ScrollStaggerItem({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div className={className} variants={scrollVariants.staggerItem}>
      {children}
    </motion.div>
  );
}
