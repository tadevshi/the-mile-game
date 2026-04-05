import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import corkTexture from '@/assets/cartelera.png';
import { Button } from '@/shared';
import { useEventStore } from '@/shared/store/eventStore';
import { useSecretBoxSubmission } from '../hooks/useSecretBoxSubmission';

type PageState = 'form' | 'success' | 'invalid_token';

export function SecretBoxPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const currentEvent = useEventStore((state) => state.currentEvent);
  const honoreeLabel = currentEvent?.name?.trim() || 'este evento';

  // Si no hay token en la URL → página de error
  const initialState: PageState = token ? 'form' : 'invalid_token';
  const [pageState, setPageState] = useState<PageState>(initialState);

  // Form state
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isSubmitting, submitSecretPostcard } = useSecretBoxSubmission({ token, slug });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Solo se permiten imágenes o videos');
      return;
    }

    setError(null);
    setMediaFile(file);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleSubmit = async () => {
    if (!mediaFile) {
      setError('Agregá una foto o un video');
      return;
    }
    if (!senderName.trim()) {
      setError('Escribí tu nombre');
      return;
    }

    setError(null);

    try {
      await submitSecretPostcard(mediaFile, message, senderName);
      setPageState('success');
    } catch (err: unknown) {
      // 401 = token inválido
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 401) {
          setPageState('invalid_token');
          return;
        }
      }
      setError('Algo salió mal. Revisá tu conexión e intentá de nuevo.');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8">
      {/* Fondo de corcho */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${corkTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none bg-black/40" />

      <AnimatePresence mode="wait">
        {/* ── Estado: token inválido ── */}
        {pageState === 'invalid_token' && (
          <motion.div
            key="invalid"
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 space-y-4">
              <p className="text-5xl">🔒</p>
              <h1 className="text-2xl font-display text-accent">Link inválido</h1>
              <p className="text-gray-600 text-sm">
                Este link no es válido o ya expiró. Pedile el link correcto a quien te lo compartió.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Estado: formulario ── */}
        {pageState === 'form' && (
          <motion.div
            key="form"
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-6 pt-8 pb-6 text-center">
                <motion.p
                  className="text-4xl mb-2"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
                >
                  🎁
                </motion.p>
                <h1 className="text-2xl font-display text-white drop-shadow">
                  Secret Box para {honoreeLabel}
                </h1>
                <p className="text-white/90 text-sm mt-1">
                  Enviá un mensaje especial que se revelará durante el evento
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Nombre del remitente */}
                <div className="space-y-1.5">
                  <label htmlFor="secret-box-sender-name" className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Tu nombre:
                  </label>
                  <input
                    id="secret-box-sender-name"
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="¿Cómo te llamás?"
                    maxLength={80}
                    className="w-full px-0 py-2.5 bg-transparent border-b-2 border-gray-200 text-sm focus:outline-none text-gray-700 rounded-none"
                  />
                </div>

                {/* Zona de foto */}
                <div>
                  <label htmlFor="secret-box-image-upload" className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                    Tu foto o video:
                  </label>
                  <input
                    id="secret-box-image-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {mediaPreview ? (
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                      {mediaFile?.type.startsWith('video/') ? (
                        <video
                          src={mediaPreview}
                          className="w-full h-full object-cover"
                          controls
                          playsInline
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium shadow-lg cursor-pointer"
                      >
                        {mediaFile?.type.startsWith('video/') ? '🎬' : '📷'} Cambiar
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
                      style={{
                        borderColor: 'var(--color-secondary)',
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                      }}
                    >
                      <span className="text-4xl">🎞️</span>
                      <span className="text-sm text-gray-500 font-medium">
                        Elegir una foto o video
                      </span>
                    </motion.button>
                  )}
                </div>

                {/* Mensaje opcional */}
                <div className="space-y-1.5">
                  <label htmlFor="secret-box-message" className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Tu mensaje para {honoreeLabel} (opcional):
                  </label>
                  <textarea
                    id="secret-box-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Escribile algo especial a ${honoreeLabel} o dejalo vacío para enviar solo la foto...`}
                    maxLength={500}
                    rows={4}
                    className="w-full px-0 py-2.5 bg-transparent border-b-2 border-gray-200 text-sm resize-none focus:outline-none font-serif italic text-gray-700 placeholder:text-gray-300 placeholder:not-italic rounded-none"
                  />
                  <p className="text-[10px] text-gray-400 text-right">
                    {message.length}/500
                  </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-500 text-center font-medium"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={!mediaFile || !senderName.trim()}
                >
                  Enviar mi postal secreta 🎁
                </Button>

                <p className="text-[10px] text-gray-400 text-center">
                  Tu postal quedará guardada en secreto hasta el momento del reveal ✨
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Estado: enviado con éxito ── */}
        {pageState === 'success' && (
          <motion.div
            key="success"
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 space-y-5">
              <motion.p
                className="text-6xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: 2, duration: 0.5, delay: 0.3 }}
              >
                🎁
              </motion.p>
              <h1 className="text-2xl font-display text-accent">
                ¡Tu postal fue guardada!
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                {honoreeLabel} va a ver tu mensaje cuando se abra la Secret Box en el evento.
                ¡Va a ser una sorpresa hermosa! 🩷
              </p>
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                <p className="text-xs text-gray-500">
                  Tu postal está guardada de forma segura y quedará oculta hasta el momento del reveal. ✨
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
