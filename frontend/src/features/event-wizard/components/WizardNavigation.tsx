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
      className="flex items-center justify-between gap-4 pt-6 border-t border-[var(--color-border-light)]"
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
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Crear Evento'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextStep}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Siguiente
          </Button>
        )}
      </div>
    </motion.div>
  );
}
