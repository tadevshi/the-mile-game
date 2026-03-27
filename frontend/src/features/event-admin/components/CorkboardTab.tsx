import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { TokenSection } from './TokenSection';
import { PostcardsPreviewGrid } from './PostcardsPreviewGrid';
import { RevealButton } from './RevealButton';
import { api } from '@/shared/lib/api';
import type { PreviewTheme } from '@/themes';
import type { EventFeatures } from '@/shared/lib/api';

interface CorkboardTabProps {
  slug: string;
  previewTheme: PreviewTheme;
}

export function CorkboardTab({ slug, previewTheme }: CorkboardTabProps) {
  const { event, refetchEvent } = useEventAdmin(slug);

  // Use preview theme colors if provided, otherwise use the event's current theme
  const theme = previewTheme;

  // Features state
  const [features, setFeatures] = useState<EventFeatures>({
    quiz: true,
    corkboard: true,
    secretBox: false,
  });

  // Background upload state
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  // Initialize from event data
  useEffect(() => {
    if (event?.settings?.background_url) {
      setBackgroundPreview(event.settings.background_url);
    }
    if (event?.features) {
      setFeatures(event.features as EventFeatures);
    }
  }, [event?.settings?.background_url, event?.features]);

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onload = () => setBackgroundPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploadingBackground(true);
    try {
      const result = await api.uploadEventMedia(slug, 'background', file);
      setBackgroundPreview(result.url);
      refetchEvent();
    } catch (err) {
      setBackgroundPreview(event?.settings?.background_url || null);
    } finally {
      setIsUploadingBackground(false);
      if (backgroundInputRef.current) backgroundInputRef.current.value = '';
    }
  };

  const handleDeleteBackground = async () => {
    if (!event?.settings?.background_url) return;
    setIsUploadingBackground(true);
    try {
      await api.deleteEventMedia(slug, 'background');
      setBackgroundPreview(null);
      refetchEvent();
    } catch (err) {
      // Keep current preview on error
    } finally {
      setIsUploadingBackground(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display mb-1" style={{ color: theme.textColor }}>
          Corkboard &amp; Secret Box
        </h2>
        <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
          Personaliza la cartelera y gestiona la caja secreta.
        </p>
      </div>

      {/* Secret Box Management — solo visible si secretBox está habilitado */}
      {features.secretBox && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 pt-2 border-t"
          style={{ borderColor: `${theme.secondaryColor}50` }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
            Gestión de Secret Box
          </h3>

          {/* Token / Link Sharing */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl"
            style={{ backgroundColor: `${theme.secondaryColor}20` }}
          >
            <TokenSection slug={slug} theme={theme} />
          </motion.div>

          {/* Postcards Preview Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl"
            style={{ backgroundColor: `${theme.secondaryColor}20` }}
          >
            <PostcardsPreviewGrid slug={slug} theme={theme} />
          </motion.div>

          {/* Reveal Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl"
            style={{ backgroundColor: `${theme.secondaryColor}20` }}
          >
            <RevealButton slug={slug} theme={theme} />
          </motion.div>
        </motion.div>
      )}

      {/* Personalización del Corkboard — solo visible si corkboard está habilitado */}
      {features.corkboard && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 pt-2"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
            Personalización del Corkboard
          </h3>

          {/* Fondo personalizado */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: `${theme.secondaryColor}30`, borderColor: `${theme.secondaryColor}50`, borderWidth: '1px' }}>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4" style={{ color: theme.primaryColor }} />
              <p className="font-medium" style={{ color: theme.textColor }}>Fondo personalizado</p>
            </div>
            <p className="text-sm mb-3" style={{ color: `${theme.textColor}80` }}>
              Imagen de fondo para la cartelera de postales. Si no se configura, se usa la textura de corcho por defecto.
            </p>

            {/* Preview con iconos superpuestos */}
            <div className="relative w-full h-32 rounded-lg border-2 border-dashed bg-white overflow-hidden" style={{ borderColor: `${theme.primaryColor}30` }}>
              {backgroundPreview ? (
                <img
                  src={backgroundPreview}
                  alt="Fondo del corkboard"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8" style={{ color: `${theme.primaryColor}50` }} />
                </div>
              )}

              {/* Botones superpuestos */}
              <div className="absolute top-2 right-2 flex gap-2">
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundChange}
                  className="hidden"
                />
                <button
                  onClick={() => backgroundInputRef.current?.click()}
                  disabled={isUploadingBackground}
                  className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all hover:scale-105 disabled:opacity-50"
                  title="Subir fondo"
                >
                  {isUploadingBackground ? (
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }} />
                  ) : (
                    <Upload className="w-4 h-4" style={{ color: theme.primaryColor }} />
                  )}
                </button>
                {backgroundPreview && (
                  <button
                    onClick={handleDeleteBackground}
                    disabled={isUploadingBackground}
                    className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all hover:scale-105 disabled:opacity-50"
                    title="Eliminar fondo"
                  >
                    {isUploadingBackground ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
