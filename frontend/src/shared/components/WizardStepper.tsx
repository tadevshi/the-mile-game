import { motion } from 'framer-motion';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function WizardStepper({ steps, currentStep, className = '' }: WizardStepperProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted || isCurrent 
                    ? 'var(--color-primary)' 
                    : '#E5E7EB', // gray-200
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              >
                {isCompleted ? (
                  <span className="text-white">✓</span>
                ) : (
                  <span className={isCurrent ? 'text-white' : 'text-gray-400'}>
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`mt-1 text-xs font-medium whitespace-nowrap ${
                  isCurrent
                    ? ''
                    : isCompleted
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                style={{ color: isCurrent ? 'var(--color-primary)' : undefined }}
              >
                {step}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: index < currentStep 
                    ? 'var(--color-primary)' 
                    : '#E5E7EB', // gray-200
                }}
                className="w-12 h-0.5 mx-1 mb-5"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
