import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { api, type Event, type EventFeatures } from '@/shared/lib/api';
import { Button } from '@/shared/components/Button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Switch } from '@/shared/components/Switch';

const DEFAULT_FEATURES: EventFeatures = {
  quiz: true,
  corkboard: true,
  secretBox: false,
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export function CreateEventPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    date: '',
    description: '',
  });
  const [features, setFeatures] = useState<EventFeatures>(DEFAULT_FEATURES);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Debounced slug generation
  useEffect(() => {
    if (!formData.name || formData.slug) return; // Don't override custom slug

    const timer = setTimeout(() => {
      const generated = generateSlug(formData.name);
      setFormData((prev) => ({ ...prev, slug: generated }));
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name]);

  // Check slug availability
  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const checkSlug = async () => {
      setIsCheckingSlug(true);
      try {
        await api.getEventBySlug(formData.slug);
        setSlugAvailable(false); // Event exists
      } catch (err: unknown) {
        // 404 means available
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            setSlugAvailable(true);
          }
        }
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timer = setTimeout(checkSlug, 300);
    return () => clearTimeout(timer);
  }, [formData.slug]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'El nombre del evento es requerido';
    }

    if (!formData.date) {
      errors.date = 'La fecha del evento es requerida';
    }

    if (!formData.slug.trim()) {
      errors.slug = 'El URL del evento es requerida';
    } else if (formData.slug.length < 3) {
      errors.slug = 'El URL debe tener al menos 3 caracteres';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Solo letras minúsculas, números y guiones';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (slugAvailable === false) {
      setError('El URL del evento ya está en uso. Escolge otro.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newEvent = await api.createEvent({
        name: formData.name,
        slug: formData.slug,
        date: formData.date,
        description: formData.description,
        features,
      });

      navigate(`/admin/event/${newEvent.slug}/theme`, { replace: true });
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el evento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setError(null);
  };

  const handleFeatureToggle = (key: keyof EventFeatures) => (checked: boolean) => {
    setFeatures((prev) => ({ ...prev, [key]: checked }));
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8"
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-serif text-gray-800 mb-2">
              Crear Nuevo Evento
            </h1>
            <p className="text-gray-500">
              Configura los detalles de tu evento
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Información Básica
              </h2>

              {/* Event Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del evento *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                    validationErrors.name
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-pink-100 focus:border-pink-300'
                  } bg-white/50`}
                  placeholder="Mi Cumpleaños 2026"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha del evento *
                </label>
                <div className="relative">
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                      validationErrors.date
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-pink-100 focus:border-pink-300'
                    } bg-white/50`}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {validationErrors.date && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.date}</p>
                )}
              </div>

              {/* Custom URL */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  URL personalizada
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm whitespace-nowrap">
                    themile.game/
                  </span>
                  <div className="relative flex-1">
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      value={formData.slug}
                      onChange={(e) => {
                        const value = generateSlug(e.target.value);
                        setFormData((prev) => ({ ...prev, slug: value }));
                        if (validationErrors.slug) {
                          setValidationErrors((prev) => ({ ...prev, slug: '' }));
                        }
                        setError(null);
                      }}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                        validationErrors.slug
                          ? 'border-red-300 focus:border-red-400'
                          : slugAvailable === false
                          ? 'border-red-300 focus:border-red-400'
                          : slugAvailable === true
                          ? 'border-green-300 focus:border-green-400'
                          : 'border-pink-100 focus:border-pink-300'
                      } bg-white/50`}
                      placeholder="mi-evento"
                    />
                    {isCheckingSlug && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                    {!isCheckingSlug && slugAvailable === true && (
                      <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                {(validationErrors.slug || slugAvailable === false) && (
                  <p className="mt-1 text-sm text-red-500">
                    {validationErrors.slug || 'Este URL ya está en uso'}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-100 focus:border-pink-300 bg-white/50 resize-none transition-all duration-200 focus:outline-none"
                  placeholder="Una descripción breve de tu evento..."
                />
              </div>
            </div>

            {/* Section 2: Features */}
            <div className="space-y-5 pt-6 border-t border-pink-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Características
              </h2>

              <div className="space-y-4">
                {/* Quiz Toggle */}
                <div className="flex items-center justify-between p-4 bg-pink-50/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Quiz (Trivia)</p>
                    <p className="text-sm text-gray-500">Juego de preguntas sobre la cumpleañera</p>
                  </div>
                  <Switch
                    checked={features.quiz}
                    onChange={handleFeatureToggle('quiz')}
                  />
                </div>

                {/* Corkboard Toggle */}
                <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Cartelera de Corcho</p>
                    <p className="text-sm text-gray-500">Postales y mensajes de invitados</p>
                  </div>
                  <Switch
                    checked={features.corkboard}
                    onChange={handleFeatureToggle('corkboard')}
                  />
                </div>

                {/* Secret Box Toggle */}
                <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Caja Secreta</p>
                    <p className="text-sm text-gray-500">Sorpresas de familiares y amigos</p>
                  </div>
                  <Switch
                    checked={features.secretBox}
                    onChange={handleFeatureToggle('secretBox')}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="flex-1 py-3"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Crear Evento'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
