import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useWizardStore } from '../store/wizardStore';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { api } from '@/shared/lib/api';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function Step1_BasicInfo() {
  const { formData, updateFormData, validationErrors, slugAvailable, setSlugAvailable, setValidationErrors } =
    useWizardStore();

  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [localSlugEdited, setLocalSlugEdited] = useState(false);

  useEffect(() => {
    if (!formData.name || localSlugEdited) return;

    const timer = setTimeout(() => {
      const generated = generateSlug(formData.name);
      updateFormData({ slug: generated });
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name, localSlugEdited]);

  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const checkSlug = async () => {
      setIsCheckingSlug(true);
      try {
        await api.getEventBySlug(formData.slug);
        setSlugAvailable(false);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) {
          setSlugAvailable(true);
        }
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timer = setTimeout(checkSlug, 300);
    return () => clearTimeout(timer);
  }, [formData.slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
    if (name === 'slug') {
      setLocalSlugEdited(true);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = generateSlug(e.target.value);
    updateFormData({ slug: value });
    setLocalSlugEdited(true);
    if (validationErrors.slug) {
      setValidationErrors({ ...validationErrors, slug: '' });
    }
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
          Información del Evento
        </h2>
        <p className="text-gray-500 text-sm">
          Los datos básicos para identificar tu evento
        </p>
      </div>

      <div className="space-y-5">
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
            placeholder="Cumpleaños de Mile 2026"
          />
          {validationErrors.name && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.name}
            </p>
          )}
        </div>

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
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.date}
            </p>
          )}
        </div>

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
                onChange={handleSlugChange}
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
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.slug || 'Este URL ya está en uso'}
            </p>
          )}
        </div>

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
    </motion.div>
  );
}
