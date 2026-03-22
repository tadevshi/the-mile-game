import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { LottieAnimation } from '@/shared/components/LottieAnimation';
import loadingAnimation from '@/../public/animations/empty.json';

interface EmptyStateProps {
  onCreateEvent?: () => void;
}

export function EmptyState({ onCreateEvent }: EmptyStateProps) {
  const navigate = useNavigate();

  const handleCreate = () => {
    if (onCreateEvent) {
      onCreateEvent();
    } else {
      navigate('/events/new');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-4"
    >
      {/* Lottie Animation Illustration */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-40 h-40 mx-auto mb-8 relative"
      >
        <LottieAnimation
          animationData={loadingAnimation}
          height={160}
          width={160}
          loop={true}
          autoplay={true}
        />
        
        {/* Floating elements */}
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-2 -right-2 text-3xl"
        >
          🎈
        </motion.div>
        <motion.div
          animate={{ y: [5, -5, 5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1 -left-3 text-3xl"
        >
          🎉
        </motion.div>
      </motion.div>

      {/* Text */}
      <h2 className="text-2xl font-display text-gray-800 dark:text-white mb-3">
        No tenés eventos aún
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
        Crea tu primer evento y comienza a organizar experiencias únicas para tus invitados.
      </p>

      {/* CTA */}
      <Button
        onClick={handleCreate}
        className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-200 dark:shadow-pink-900/50"
      >
        <PartyPopper className="w-5 h-5" />
        Creá tu primer evento
      </Button>

      {/* Tips */}
      <div className="mt-12 text-left max-w-md mx-auto">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          ¿Qué podés crear?
        </h3>
        <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <span className="text-pink-500">✓</span>
            Cumpleaños con quiz interactivo
          </li>
          <li className="flex items-center gap-2">
            <span className="text-pink-500">✓</span>
            Eventos corporativos con carteleras
          </li>
          <li className="flex items-center gap-2">
            <span className="text-pink-500">✓</span>
            Bodas con caja de sorpresas
          </li>
          <li className="flex items-center gap-2">
            <span className="text-pink-500">✓</span>
            Cualquier celebración especial
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
