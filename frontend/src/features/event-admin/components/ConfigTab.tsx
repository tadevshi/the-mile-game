import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCircle, Save, Share2, Upload, Trash2, Eye } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Switch } from '@/shared/components/Switch';
import { useEventAdmin, type AdminTab } from '../hooks/useEventAdmin';
import type { EventFeatures } from '@/shared/lib/api';
import { api } from '@/shared/lib/api';
import { FEATURES } from '@/shared/lib/featureFlags';
import type { PreviewTheme } from '@/themes';
import { useTheme } from '@/shared/theme/useTheme';
import { DriveConnectionPanel } from '@/features/admin/components/DriveConnectionPanel';
import { BackupJobsList } from '@/features/admin/components/BackupJobsList';

interface ConfigTabProps {
  slug: string;
  currentTab: AdminTab;
  previewTheme?: PreviewTheme;
}

export function ConfigTab({ slug, previewTheme }: ConfigTabProps) {
  const { event, refetchEvent } = useEventAdmin(slug);
  const { currentTheme } = useTheme();
  
  // Use preview theme colors if provided, otherwise use the event's current theme
  const theme = previewTheme || currentTheme;
  const isDarkTheme = theme.backgroundStyle === 'dark';
  const floatingButtonSurface = isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  const floatingButtonHoverSurface = isDarkTheme ? 'rgba(30, 41, 59, 0.96)' : '#FFFFFF';
  const [features, setFeatures] = useState<EventFeatures>({
    quiz: true,
    corkboard: true,
    secretBox: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Logo upload state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Initialize previews from event data (from nested settings)
  useEffect(() => {
    if (event?.settings?.logo_url) {
      setLogoPreview(event.settings.logo_url);
    }
  }, [event?.settings?.logo_url]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploadingLogo(true);
    try {
      const result = await api.uploadEventMedia(slug, 'logo', file);
      setLogoPreview(result.url);
      refetchEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir logo');
      setLogoPreview(event?.settings?.logo_url || null);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!event?.settings?.logo_url) return;
    setIsUploadingLogo(true);
    try {
      await api.deleteEventMedia(slug, 'logo');
      setLogoPreview(null);
      refetchEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (event?.features) {
      setFeatures(event.features as EventFeatures);
    }
  }, [event?.features]);

  const handleToggle = (key: keyof EventFeatures) => (checked: boolean) => {
    setFeatures((prev) => ({ ...prev, [key]: checked }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.updateEventFeatures(slug, features);
      setSuccess(true);
      refetchEvent();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const eventUrl = `${window.location.origin}/e/${slug}`;
  const adminUrl = `${window.location.origin}/admin/${slug}`;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Preview Banner - Shows when theme preview is active */}
      {previewTheme && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl flex items-center gap-2"
          style={{ 
            backgroundColor: `${theme.primaryColor}15`,
            border: `1px solid ${theme.primaryColor}30`
          }}
        >
          <Eye className="w-4 h-4" style={{ color: theme.primaryColor }} />
          <p className="text-sm" style={{ color: theme.textColor }}>
            <span className="font-medium" style={{ color: theme.primaryColor }}>Vista previa activa:</span>{' '}
            Así se verá tu evento con el tema seleccionado
          </p>
        </motion.div>
      )}

      <div>
        <h2 className="text-lg font-display mb-1" style={{ color: theme.textColor }}>
          Configuración General
        </h2>
        <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
          {event?.name || slug}
        </p>
      </div>

      {event?.description && (
        <div className="rounded-xl p-4 border" style={{ 
          backgroundColor: `${theme.secondaryColor}30`,
          borderColor: `${theme.secondaryColor}50`
        }}>
          <p className="text-sm" style={{ color: theme.textColor }}>{event.description}</p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
          Características
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
            <div>
              <p className="font-medium" style={{ color: theme.textColor }}>Quiz</p>
              <p className="text-sm" style={{ color: `${theme.textColor}80` }}>Trivia personalizada para este evento</p>
            </div>
            <Switch
              checked={features.quiz}
              onChange={handleToggle('quiz')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
            <div>
              <p className="font-medium" style={{ color: theme.textColor }}>Cartelera de Corcho</p>
              <p className="text-sm" style={{ color: `${theme.textColor}80` }}>Postales de invitados</p>
            </div>
            <Switch
              checked={features.corkboard}
              onChange={handleToggle('corkboard')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
            <div>
              <p className="font-medium" style={{ color: theme.textColor }}>Caja Secreta</p>
              <p className="text-sm" style={{ color: `${theme.textColor}80` }}>Sorpresas de familiares</p>
            </div>
            <Switch
              checked={features.secretBox}
              onChange={handleToggle('secretBox')}
            />
          </div>
        </div>
      </div>

      {/* Logo / Imagen representativa */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
          Logo del Evento
        </h3>

        <div className="p-4 rounded-xl" style={{ backgroundColor: `${theme.secondaryColor}30`, borderColor: `${theme.secondaryColor}50`, borderWidth: '1px' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
            <p className="font-medium" style={{ color: theme.textColor }}>Logo o imagen representativa</p>
          </div>
          <p className="text-sm mb-3" style={{ color: `${theme.textColor}80` }}>
            Se usa como imagen de respaldo para videos y otros elementos del evento.
          </p>

          {/* Preview con iconos superpuestos */}
          <div className="relative w-full h-32 rounded-lg border-2 border-dashed bg-white overflow-hidden" style={{ borderColor: `${theme.primaryColor}30` }}>
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo del evento"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: `${theme.primaryColor}50` }} />
              </div>
            )}

            {/* Botones superpuestos */}
            <div className="absolute top-2 right-2 flex gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="p-2 rounded-full shadow-md transition-all hover:scale-105 disabled:opacity-50"
                style={{ backgroundColor: floatingButtonSurface }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = floatingButtonHoverSurface;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = floatingButtonSurface;
                }}
                title="Subir logo"
              >
                {isUploadingLogo ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }} />
                ) : (
                  <Upload className="w-4 h-4" style={{ color: theme.primaryColor }} />
                )}
              </button>
              {logoPreview && (
                <button
                  onClick={handleDeleteLogo}
                  disabled={isUploadingLogo}
                  className="p-2 rounded-full shadow-md transition-all hover:scale-105 disabled:opacity-50"
                  style={{ backgroundColor: floatingButtonSurface }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = floatingButtonHoverSurface;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = floatingButtonSurface;
                  }}
                  title="Eliminar logo"
                >
                  {isUploadingLogo ? (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
          Enlaces
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div 
              className="flex-1 rounded-xl px-4 py-3 text-sm truncate font-mono"
              style={{ 
                backgroundColor: `${theme.primaryColor}15`,
                color: theme.textColor,
                border: `1px solid ${theme.primaryColor}30`
              }}
            >
              {eventUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(eventUrl)}
              icon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div 
              className="flex-1 rounded-xl px-4 py-3 text-sm truncate font-mono"
              style={{ 
                backgroundColor: `${theme.secondaryColor}30`,
                color: theme.textColor,
                border: `1px solid ${theme.secondaryColor}50`
              }}
            >
              {adminUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(adminUrl)}
              icon={<Share2 className="w-4 h-4" />}
            >
              Compartir
            </Button>
          </div>
        </div>
      </div>

      {FEATURES.GOOGLE_DRIVE && event?.id && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
            Respaldo en Google Drive
          </h3>

          <div
            className="rounded-xl p-4 border space-y-4"
            style={{
              backgroundColor: `${theme.secondaryColor}20`,
              borderColor: `${theme.secondaryColor}50`,
            }}
          >
            <DriveConnectionPanel />
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: `${theme.secondaryColor}20`,
              borderColor: `${theme.secondaryColor}50`,
            }}
          >
            <BackupJobsList eventId={event.id} />
          </div>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Cambios guardados correctamente
        </motion.div>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        isLoading={isSaving}
        fullWidth
        icon={<Save className="w-4 h-4" />}
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
          boxShadow: `0 10px 15px -3px ${theme.primaryColor}40`,
        }}
      >
        Guardar Cambios
      </Button>
    </div>
  );
}
