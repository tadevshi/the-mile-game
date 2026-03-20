import { motion } from 'framer-motion';
import type { LandingFeature } from '../types/landing.types';

const features: LandingFeature[] = [
  {
    id: 'quiz',
    icon: '🧠',
    title: 'Quiz Interactivo',
    description: 'Preguntas personalizadas para conocer a tu cumpleañero/a. Ranking en tiempo real.',
  },
  {
    id: 'corkboard',
    icon: '📌',
    title: 'Cartelera de Fotos',
    description: 'Invitados comparten fotos y mensajes en un corcho digital colaborativo.',
  },
  {
    id: 'secret',
    icon: '🎁',
    title: 'Caja Secreta',
    description: 'Sorpresas de invitados remotos que se revelan en el momento perfecto.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function FeaturesGrid() {
  return (
    <section className="py-20 px-4 bg-white dark:bg-slate-900">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display text-gray-800 dark:text-white mb-4">
            Todo lo que necesitás para tu evento
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Herramientas interactivas diseñadas para hacer tu celebración única y memorable.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.id}
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-6 border border-pink-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="text-5xl mb-4">{feature.icon}</div>
              
              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {feature.title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Feature indicator */}
              <div className="mt-4 pt-4 border-t border-pink-100 dark:border-slate-700">
                <span className="text-xs font-medium text-pink-500 dark:text-pink-400">
                  ✓ Incluido en todos los planes
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
