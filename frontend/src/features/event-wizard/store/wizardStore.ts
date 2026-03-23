import { create } from 'zustand';
import type { EventFeatures } from '@/shared/lib/api';
import type { WizardFormData } from '../types/wizard.types';
import { DEFAULT_WIZARD_FEATURES } from '../types/wizard.types';

interface WizardState {
  currentStep: number;
  formData: WizardFormData;
  validationErrors: Record<string, string>;
  slugAvailable: boolean | null;
  isCheckingSlug: boolean;
  isSubmitting: boolean;
  submitError: string | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<WizardFormData>) => void;
  updateFeatures: (features: EventFeatures) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  setSlugAvailable: (available: boolean | null) => void;
  setIsCheckingSlug: (checking: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmitError: (error: string | null) => void;
  reset: () => void;
}

const initialFormData: WizardFormData = {
  name: '',
  slug: '',
  date: '',
  description: '',
  features: DEFAULT_WIZARD_FEATURES,
  themeId: undefined,
};

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: 0,
  formData: { ...initialFormData },
  validationErrors: {},
  slugAvailable: null,
  isCheckingSlug: false,
  isSubmitting: false,
  submitError: null,

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get();
    set({ currentStep: Math.min(currentStep + 1, 2) });
  },

  prevStep: () => {
    const { currentStep } = get();
    set({ currentStep: Math.max(currentStep - 1, 0) });
  },

  updateFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
      validationErrors: {},
    })),

  updateFeatures: (features) =>
    set((state) => ({
      formData: { ...state.formData, features },
    })),

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  setSlugAvailable: (available) => set({ slugAvailable: available }),

  setIsCheckingSlug: (checking) => set({ isCheckingSlug: checking }),

  setSubmitting: (submitting) => set({ isSubmitting: submitting }),

  setSubmitError: (error) => set({ submitError: error }),

  reset: () =>
    set({
      currentStep: 0,
      formData: { ...initialFormData },
      validationErrors: {},
      slugAvailable: null,
      isCheckingSlug: false,
      isSubmitting: false,
      submitError: null,
    }),
}));

export function validateStep(step: number, formData: WizardFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!formData.name.trim()) {
      errors.name = 'El nombre del evento es requerido';
    }
    if (!formData.date) {
      errors.date = 'La fecha del evento es requerida';
    }
    // Slug is optional - if provided, validate format
    if (formData.slug.trim()) {
      if (formData.slug.length < 3) {
        errors.slug = 'El URL debe tener al menos 3 caracteres';
      } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        errors.slug = 'Solo letras minúsculas, números y guiones';
      }
    }
  }

  return errors;
}
