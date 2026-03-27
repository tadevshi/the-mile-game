import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Trash2, Image as ImageIcon, AlertTriangle, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { useResetSecretBox } from '../hooks/useSecretBox';
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
  const resetSecretBox = useResetSecretBox(slug);

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

  // Advanced options collapsible state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Reset confirmation modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleResetClick = () => {
    setShowResetModal(true);
    setResetConfirmText('');
    setResetResult(null);
  };

  const handleResetConfirm = async () => {
    if (resetConfirmText !== 'RESET') return;

    setResetResult({ success: true, message: '' });
    try {
      const result = await resetSecretBox.mutateAsync();
      setResetResult({
        success: true,
        message: `Se ocultaron ${result.count} postales secretas.`,
      });
      // Close modal after short delay on success
      setTimeout(() => {
        setShowResetModal(false);
        setResetConfirmText('');
        setResetResult(null);
      }, 2000);
    } catch (err) {
      setResetResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error al resetear la Secret Box.',
      });
    }
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetConfirmText('');
    setResetResult(null);
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

          {/* Advanced Options */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: `${theme.secondaryColor}10`, borderColor: `${theme.secondaryColor}30`, borderWidth: '1px' }}
          >
            {/* Collapsible Header */}
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/5 transition-colors"
            >
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${theme.textColor}80` }}>
                Opciones Avanzadas
              </span>
              {showAdvancedOptions ? (
                <ChevronUp className="w-4 h-4" style={{ color: theme.textColor }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: theme.textColor }} />
              )}
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {showAdvancedOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: `${theme.secondaryColor}30` }}>
                    {/* Reset Secret Box Button */}
                    <div className="pt-3">
                      <p className="text-sm mb-3" style={{ color: `${theme.textColor}80` }}>
                        Esta opción oculta todas las postales secretas que fueron reveladas, permitiendo ver la animación de revelación nuevamente.
                      </p>
                      <button
                        onClick={handleResetClick}
                        className="w-full px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-red-200"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Resetear Secret Box
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseResetModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-red-800">Resetear Secret Box</h3>
                  </div>
                  <button
                    onClick={handleCloseResetModal}
                    className="p-1 hover:bg-red-100 rounded-full transition-colors"
                    disabled={resetSecretBox.isPending}
                  >
                    <X className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {resetResult?.success ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-4"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="text-green-700 font-medium">{resetResult.message}</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-6">
                      <p className="text-red-700 font-semibold text-lg mb-2">
                        ⚠️ Esta acción no se puede deshacer
                      </p>
                      <p className="text-gray-600 text-sm">
                        Se ocultarán todas las postales secretas que fueron reveladas. Los invitados podrán ver la animación de revelación nuevamente.
                      </p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Escribe <span className="font-bold text-red-600">RESET</span> para confirmar:
                      </label>
                      <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                        placeholder="RESET"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-center font-mono text-lg focus:border-red-400 focus:outline-none transition-colors"
                        disabled={resetSecretBox.isPending}
                      />
                    </div>

                    {resetResult && !resetResult.success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <p className="text-red-700 text-sm">{resetResult.message}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseResetModal}
                        disabled={resetSecretBox.isPending}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleResetConfirm}
                        disabled={resetConfirmText !== 'RESET' || resetSecretBox.isPending}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {resetSecretBox.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          'Resetear'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
