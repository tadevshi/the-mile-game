import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useWizardStore, validateStep } from '../store/wizardStore';
import { WizardStepper } from '@/shared/components/WizardStepper';
import { WIZARD_STEPS } from '../types/wizard.types';
import { Step1_BasicInfo } from '../components/Step1_BasicInfo';
import { Step2_Features } from '../components/Step2_Features';
import { Step3_Theme } from '../components/Step3_Theme';
import { WizardNavigation } from '../components/WizardNavigation';
import { api } from '@/shared/lib/api';

const stepComponents = [Step1_BasicInfo, Step2_Features, Step3_Theme];

export function EventWizardPage() {
  const navigate = useNavigate();
  const {
    currentStep,
    formData,
    slugAvailable,
    setValidationErrors,
    setSubmitting,
    setSubmitError,
    reset,
  } = useWizardStore();

  const handleSubmit = useCallback(async () => {
    const errors = validateStep(currentStep, formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (slugAvailable === false) {
      setSubmitError('El URL del evento ya está en uso. Escoge otro.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const newEvent = await api.createEvent({
        name: formData.name,
        slug: formData.slug,
        date: formData.date,
        description: formData.description,
        features: formData.features,
      });

      if (formData.themeId) {
        try {
          await api.post(`/admin/events/${newEvent.slug}/theme/preset`, {
            preset: formData.themeId,
          });
        } catch {
          console.warn('Could not apply theme preset, skipping...');
        }
      }

      reset();
      console.log('Event created, redirecting to:', newEvent.slug);
      navigate(`/e/${newEvent.slug}/admin?tab=config`, { replace: true });
    } catch (err) {
      console.error('Error creating event:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Error al crear el evento'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentStep, formData, slugAvailable, navigate, reset, setValidationErrors, setSubmitting, setSubmitError]);

  const handleCancel = () => {
    reset();
    navigate('/dashboard');
  };

  const CurrentStepComponent = stepComponents[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-pink-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-display text-xl text-gray-800">
              Crear Nuevo Evento
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8"
        >
          <WizardStepper
            steps={WIZARD_STEPS.map((s) => s.title)}
            currentStep={currentStep}
            className="mb-8"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentStepComponent />
            </motion.div>
          </AnimatePresence>

          <WizardNavigation onSubmit={handleSubmit} />
        </motion.div>
      </main>
    </div>
  );
}
