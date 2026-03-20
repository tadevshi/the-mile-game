import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  eventType: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    quote: 'La mejor manera de hacer que tus invitados se sientan parte de la celebración, incluso cuando no pueden estar presentes.',
    name: 'María García',
    role: 'Mamá de Ana',
    avatar: '👩',
    eventType: 'Cumpleaños',
  },
  {
    id: '2',
    quote: 'El quiz fue el highlight de la fiesta. Todos querían ver quién conocía mejor a la cumpleañera. ¡Risas garantizadas!',
    name: 'Carlos Rodríguez',
    role: 'Tío de Sofía',
    avatar: '👨',
    eventType: 'Cumpleaños infantil',
  },
  {
    id: '3',
    quote: 'Pudimos recibir mensajes de familiares que viven lejos. Cuando se abrió la caja secreta, fue超级 emotivo.',
    name: 'Laura Martínez',
    role: 'Organizadora',
    avatar: '👩‍🦰',
    eventType: 'Baby shower',
  },
  {
    id: '4',
    quote: 'La cartelera de fotos digital fue un éxito. Todos los invitados subieron sus fotos y las compartimos en el momento.',
    name: 'Diego Sánchez',
    role: 'Papá de Tomás',
    avatar: '👨‍🦱',
    eventType: 'Cumpleaños',
  },
  {
    id: '5',
    quote: 'Fácil de configurar, hermoso de ver. El tema visual rosa era perfecto para la fiesta de mi hija.',
    name: 'Valentina Torres',
    role: 'Mamá de Isabella',
    avatar: '👩‍🦳',
    eventType: 'Cumpleaños',
  },
];

/**
 * TestimonialsCarousel - Framer Motion carousel with photos/names/event-type.
 * Navigation via arrows and swipe.
 */
export function TestimonialsCarousel() {
  const [[current, direction], setCurrent] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    setCurrent(([prev]) => {
      const next = prev + newDirection;
      if (next < 0) return [testimonials.length - 1, newDirection];
      if (next >= testimonials.length) return [0, newDirection];
      return [next, newDirection];
    });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <section className="px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-sm font-medium rounded-full mb-4">
            Testimonios
          </span>
          <h2 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
            Lo que dicen nuestros usuarios
          </h2>
        </motion.div>

        {/* Carousel */}
        <div className="relative overflow-hidden">
          {/* Navigation Arrows */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:bg-pink-100 dark:hover:bg-pink-900/30"
            style={{ background: 'rgba(255,255,255,0.8)' }}
            aria-label="Anterior testimonio"
          >
            <span style={{ color: 'var(--primary)' }}>‹</span>
          </button>

          <button
            onClick={() => paginate(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:bg-pink-100 dark:hover:bg-pink-900/30"
            style={{ background: 'rgba(255,255,255,0.8)' }}
            aria-label="Siguiente testimonio"
          >
            <span style={{ color: 'var(--primary)' }}>›</span>
          </button>

          {/* Testimonial card */}
          <div className="px-12">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="text-center"
              >
                {/* Quote icon */}
                <div className="text-5xl mb-4" style={{ color: 'var(--primary)', opacity: 0.3 }}>
                  ❝
                </div>

                {/* Quote text */}
                <blockquote
                  className="text-lg md:text-xl mb-6 leading-relaxed"
                  style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
                >
                  {testimonials[current].quote}
                </blockquote>

                {/* Author */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: 'var(--surface-container)' }}
                  >
                    {testimonials[current].avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonials[current].name}</p>
                    <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {testimonials[current].role} · {testimonials[current].eventType}
                    </p>
                  </div>
                </div>

                {/* Event type badge */}
                <div className="mt-4">
                  <span
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      opacity: 0.1,
                    }}
                  >
                    {testimonials[current].eventType}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent([index, index > current ? 1 : -1])}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background:
                    index === current ? 'var(--primary)' : 'var(--surface-container-high)',
                  transform: index === current ? 'scale(1.3)' : 'scale(1)',
                }}
                aria-label={`Ir al testimonio ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
