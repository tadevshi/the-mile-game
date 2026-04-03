import { motion } from 'framer-motion';
import { useWizardStore } from '../store/wizardStore';
import { Switch } from '@/shared/components/Switch';
import type { EventFeatures } from '@/shared/lib/api';

const featureItems: {
  key: keyof EventFeatures;
  label: string;
  description: string;
  emoji: string;
  bgStyle: React.CSSProperties;
}[] = [
  {
    key: 'quiz',
    label: 'Quiz (Trivia)',
    description: 'Juego de preguntas sobre la cumpleañera',
    emoji: '🧠',
    bgStyle: { backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' },
  },
  {
    key: 'corkboard',
    label: 'Cartelera de Corcho',
    description: 'Postales y mensajes de invitados',
    emoji: '📌',
    bgStyle: { backgroundColor: 'color-mix(in srgb, var(--color-accent-amber, #F59E0B) 15%, transparent)' },
  },
  {
    key: 'secretBox',
    label: 'Caja Secreta',
    description: 'Sorpresas de familiares y amigos',
    emoji: '🎁',
    bgStyle: { backgroundColor: 'color-mix(in srgb, var(--color-accent-purple, #A855F7) 15%, transparent)' },
  },
];

export function Step2_Features() {
  const { formData, updateFeatures } = useWizardStore();

  const handleToggle = (key: keyof EventFeatures) => (checked: boolean) => {
    updateFeatures({ ...formData.features, [key]: checked });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display text-gray-800 mb-1">
          Características
        </h2>
        <p className="text-gray-500 text-sm">
          Activá las features que quieras incluir en tu evento
        </p>
      </div>

      <div className="space-y-4">
        {featureItems.map((item) => (
          <div key={item.key} className="p-4 rounded-xl" style={item.bgStyle}>
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="shrink-0 text-2xl leading-none">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              <div className="shrink-0 pt-0.5">
                <Switch
                  checked={formData.features[item.key]}
                  onChange={handleToggle(item.key)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-amber, #F59E0B) 10%, transparent)' }}>
        <p className="font-medium mb-1">💡 Tip</p>
        <p>
          Podés cambiar estas configuraciones más tarde desde el panel de
          administración del evento.
        </p>
      </div>
    </motion.div>
  );
}
