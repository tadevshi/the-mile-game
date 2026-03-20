import type { EventFeatures } from '@/shared/lib/api';
import type { ThemePreset } from '@/shared/theme';

export interface WizardFormData {
  name: string;
  slug: string;
  date: string;
  description: string;
  features: EventFeatures;
  themeId?: string;
}

export interface WizardStep {
  id: number;
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Información', description: 'Nombre, fecha y URL del evento' },
  { id: 2, title: 'Características', description: 'Activa las features que quieras' },
  { id: 3, title: 'Tema', description: 'Elegí el estilo visual' },
];

export const DEFAULT_WIZARD_FEATURES: EventFeatures = {
  quiz: true,
  corkboard: true,
  secretBox: false,
};

export interface ThemePreviewItem {
  preset: ThemePreset;
  isCustom?: boolean;
}
