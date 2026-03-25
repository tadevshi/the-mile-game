import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { useWizardStore } from '../store/wizardStore';
import { api } from '@/shared/lib/api';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

export function Step1_BasicInfo() {
  const { formData, updateFormData, validationErrors, setValidationErrors } =
    useWizardStore();

  useEffect(() => {
    if (!formData.name) return;

    const timer = setTimeout(() => {
      const generated = generateSlug(formData.name);
      updateFormData({ slug: generated });
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name]);

  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      return;
    }

    const checkSlug = async () => {
      try {
        await api.getEventBySlug(formData.slug);
        const generated = generateSlug(formData.name);
        updateFormData({ slug: generated });
      } catch {
        // 404 means slug is available, keep it
      }
    };

    const timer = setTimeout(checkSlug, 300);
    return () => clearTimeout(timer);
  }, [formData.slug, formData.name]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
  };

  const handleRegenerateSlug = () => {
    const generated = generateSlug(formData.name);
    updateFormData({ slug: generated });
    setValidationErrors({ ...validationErrors, slug: '' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 
          className="text-2xl font-display mb-1"
          style={{ color: 'var(--color-on-background)' }}
        >
          Información del Evento
        </h2>
        <p 
          className="text-sm"
          style={{ color: 'var(--color-on-surface-muted)' }}
        >
          Los datos básicos para identificar tu evento
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label 
            htmlFor="name" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-on-surface)' }}
          >
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
                ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
            }`}
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
            placeholder="Cumpleaños de Mile 2026"
          />
          {validationErrors.name && (
            <p 
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle className="w-4 h-4" />
              {validationErrors.name}
            </p>
          )}
        </div>

        <div>
          <label 
            htmlFor="date" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-on-surface)' }}
          >
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
                  ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
            />
            <Calendar 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" 
              style={{ color: 'var(--color-on-surface-muted)' }} 
            />
          </div>
          {validationErrors.date && (
            <p 
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle className="w-4 h-4" />
              {validationErrors.date}
            </p>
          )}
        </div>

        <div>
          <label 
            htmlFor="description" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-on-surface)' }}
          >
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border-2 focus:border-[var(--color-primary)] resize-none transition-all duration-200 focus:outline-none"
            style={{ 
              borderColor: 'var(--color-border)',
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
              color: 'var(--color-on-background)',
            }}
            placeholder="Una descripción breve de tu evento..."
          />
        </div>

        <div>
          <label 
            htmlFor="slug" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-on-surface)' }}
          >
            URL del evento
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Globe 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" 
                style={{ color: 'var(--color-on-surface-muted)' }} 
              />
              <input
                id="slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                  validationErrors.slug
                    ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
                placeholder="mi-evento-abc123"
              />
            </div>
            <button
              type="button"
              onClick={handleRegenerateSlug}
              className="p-3 rounded-xl border-2 transition-all duration-200"
              style={{ 
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)',
              }}
              title="Generar nuevo URL"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          {validationErrors.slug && (
            <p 
              className="mt-1 text-sm flex items-center gap-1"
              style={{ color: 'var(--color-error)' }}
            >
              <AlertCircle className="w-4 h-4" />
              {validationErrors.slug}
            </p>
          )}
          <p 
            className="mt-1 text-xs"
            style={{ color: 'var(--color-on-surface-muted)' }}
          >
            URL pública de tu evento: <span style={{ color: 'var(--color-primary)' }}>/e/{formData.slug || '...'}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
