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
      className="grid grid-cols-2 gap-4 pt-6 border-t border-[var(--color-border-light)]"
    >
      <div className="min-w-0">
        {currentStep > 0 && (
          <Button
            variant="outline"
            onClick={prevStep}
            icon={<ArrowLeft className="w-4 h-4" />}
            fullWidth
            className="whitespace-nowrap"
          >
            Anterior
          </Button>
        )}
      </div>

      <div className="min-w-0">
        {isLastStep ? (
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            fullWidth
            className="whitespace-nowrap"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Crear Evento'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextStep}
            icon={<ArrowRight className="w-4 h-4" />}
            fullWidth
            className="whitespace-nowrap"
          >
            Siguiente
          </Button>
        )}
      </div>
    </motion.div>
  );
}
