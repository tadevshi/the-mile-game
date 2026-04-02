import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared';
import { useEventStore, type EventFeatures } from '@/shared/store/eventStore';
import { api } from '@/shared/lib/api';
import { FeatureToggle } from '../components/FeatureToggle';

const DEFAULT_FEATURES: EventFeatures = {
  quiz: true,
  corkboard: true,
  secretBox: false,
};

export function EventSettingsPage() {
  const navigate = useNavigate();
  const { slug: eventSlug } = useParams<{ slug: string }>();

  const currentEvent = useEventStore((state) => state.currentEvent);
  const updateFeaturesAction = useEventStore((state) => state.updateFeatures);

  const [features, setFeatures] = useState<EventFeatures>(DEFAULT_FEATURES);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load current features from store on mount
  useEffect(() => {
    if (currentEvent?.features) {
      setFeatures(currentEvent.features);
    }
  }, [currentEvent?.features]);

  const handleToggle = (key: keyof EventFeatures) => (checked: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: checked,
    }));
    // Reset feedback states
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!eventSlug) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Use API directly with JWT auth
      await api.updateEventFeatures(eventSlug, features);
      // Also update store
      updateFeaturesAction(features);
      setSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving features:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate params
  if (!eventSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Faltan parámetros</p>
          <p className="text-gray-500 text-sm">
            Se requiere <code>/admin/events/:slug/settings?key=...</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-watercolor">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[var(--color-secondary)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="font-display text-xl text-gray-800">
                Configuración del Evento
              </h1>
              <p className="text-xs text-gray-500">{currentEvent?.name || eventSlug}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Features Section */}
        <section className="space-y-3">
          <h2 className="font-display text-lg text-gray-800 px-1">
            Características
          </h2>
          <div className="space-y-2">
            <FeatureToggle
              name="quiz"
              label="Quiz"
              description="Habilitar el quiz interactivo"
              checked={features.quiz}
              onChange={handleToggle('quiz')}
            />
            <FeatureToggle
              name="corkboard"
              label="Cartelera de Corcho"
              description="Permitir postales de invitados"
              checked={features.corkboard}
              onChange={handleToggle('corkboard')}
            />
            <FeatureToggle
              name="secretBox"
              label="Caja Secreta"
              description={`Activar Secret Box para ${currentEvent?.name || 'este evento'}`}
              checked={features.secretBox}
              onChange={handleToggle('secretBox')}
            />
          </div>
        </section>

        {/* Feedback Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700"
          >
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700"
          >
            <CheckCircle size={18} />
            <span className="text-sm">Cambios guardados correctamente</span>
          </motion.div>
        )}

        {/* Save Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
            isLoading={isSaving}
            icon={<Save size={18} />}
          >
            Guardar Cambios
          </Button>
        </div>
      </main>
    </div>
  );
}
