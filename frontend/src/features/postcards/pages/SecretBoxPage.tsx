import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { postcardService } from '../services/postcardApi';
import { Button } from '@/shared';

// Importar textura de corcho como asset estático
import corkTexture from '@/assets/cartelera.png';

type PageState = 'form' | 'success' | 'invalid_token';

export function SecretBoxPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  // Si no hay token en la URL → página de error
  const initialState: PageState = token ? 'form' : 'invalid_token';
  const [pageState, setPageState] = useState<PageState>(initialState);

  // Form state
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setError(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError('Agregá una foto');
      return;
    }
    if (!senderName.trim()) {
      setError('Escribí tu nombre');
      return;
    }
    if (!message.trim()) {
      setError('Escribí un mensaje para Mile');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resized = await postcardService.resizeImage(imageFile);
      await postcardService.createSecret(resized, message.trim(), senderName.trim(), token);
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
    } finally {
      setIsSubmitting(false);
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
              <div className="bg-gradient-to-r from-pink-400 to-pink-500 px-6 pt-8 pb-6 text-center">
                <motion.p
                  className="text-4xl mb-2"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
                >
                  🎁
                </motion.p>
                <h1 className="text-2xl font-display text-white drop-shadow">
                  Secret Box para Mile
                </h1>
                <p className="text-white/90 text-sm mt-1">
                  Enviá un mensaje especial que se revelará en su cumpleaños
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Nombre del remitente */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Tu nombre:
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="¿Cómo te llama Mile?"
                    maxLength={80}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-gray-700"
                  />
                </div>

                {/* Zona de foto */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
                    Tu foto:
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium shadow-lg cursor-pointer"
                      >
                        📷 Cambiar
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/50 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:border-pink-400 hover:bg-pink-50"
                    >
                      <span className="text-4xl">📸</span>
                      <span className="text-sm text-gray-500 font-medium">
                        Elegir una foto
                      </span>
                    </motion.button>
                  )}
                </div>

                {/* Mensaje */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Tu mensaje para Mile:
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribile algo especial a la cumpleañera..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 font-serif italic text-gray-700 placeholder:text-gray-300 placeholder:not-italic"
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
                  disabled={!imageFile || !senderName.trim() || !message.trim()}
                >
                  Enviar mi postal secreta 🎁
                </Button>

                <p className="text-[10px] text-gray-400 text-center">
                  Tu postal quedará guardada en secreto hasta que Mile la abra en su fiesta ✨
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
                Mile va a ver tu mensaje cuando abra la Secret Box en su fiesta.
                ¡Va a ser una sorpresa hermosa! 🩷
              </p>
              <div className="bg-pink-50 rounded-2xl p-4">
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
