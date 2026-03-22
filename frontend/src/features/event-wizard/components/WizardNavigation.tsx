import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useWizardStore } from '../store/wizardStore';
import { Button } from '@/shared/components/Button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

interface WizardNavigationProps {
  onSubmit?: () => void;
}

export function WizardNavigation({ onSubmit }: WizardNavigationProps) {
  const { currentStep, nextStep, prevStep, isSubmitting } = useWizardStore();

  const isLastStep = currentStep === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 pt-6 border-t border-pink-100"
    >
      <div>
        {currentStep > 0 && (
          <Button
            variant="outline"
            onClick={prevStep}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Anterior
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isLastStep ? (
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Crear Evento'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextStep}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200"
          >
            Siguiente
          </Button>
        )}
      </div>
    </motion.div>
  );
}
