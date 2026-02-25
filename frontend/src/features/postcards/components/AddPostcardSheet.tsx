import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared';
import { useQuizStore } from '@features/quiz/store/quizStore';

interface AddPostcardSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (image: File, message: string, senderName?: string) => Promise<void>;
}

export function AddPostcardSheet({ isOpen, onClose, onSubmit }: AddPostcardSheetProps) {
  const playerName = useQuizStore((s) => s.playerName);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState(playerName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setError(null);
    setImageFile(file);

    // Preview
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError('Tomá una foto primero');
      return;
    }
    if (!message.trim()) {
      setError('Escribí un mensaje');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(imageFile, message.trim(), senderName.trim() || undefined);
      // Limpiar y cerrar
      resetForm();
      onClose();
    } catch {
      setError('Error al subir la postal. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setMessage('');
    setSenderName(playerName);
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative z-10 w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Handle (mobile) */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="p-5 space-y-4">
              {/* Título */}
              <div className="text-center">
                <h2 className="text-xl font-display text-accent">
                  Nueva Postal
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Tomá una foto con la cumpleañera y dejá un mensaje
                </p>
              </div>

              {/* Nombre del remitente */}
              <div className="space-y-1">
                <label
                  htmlFor="postcard-sender"
                  className="text-xs text-gray-500 uppercase tracking-wider font-medium"
                >
                  Tu nombre:
                </label>
                <input
                  id="postcard-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="¿Cómo te llamás?"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-gray-700"
                />
              </div>

              {/* Zona de foto */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
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
                    {/* Botón para cambiar foto */}
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
                    className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-primary/40 bg-pink-50/50 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:border-primary/60 hover:bg-pink-50"
                  >
                    <span className="text-4xl">📸</span>
                    <span className="text-sm text-gray-500 font-medium">
                      Tomar foto / Elegir imagen
                    </span>
                  </motion.button>
                )}
              </div>

              {/* Mensaje */}
              <div className="space-y-1.5">
                <label
                  htmlFor="postcard-message"
                  className="text-xs text-gray-500 uppercase tracking-wider font-medium"
                >
                  Tu mensaje:
                </label>
                <textarea
                  id="postcard-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribí tu mensaje para Mile..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 font-serif italic text-gray-700 placeholder:text-gray-300 placeholder:not-italic"
                />
                <p className="text-[10px] text-gray-400 text-right">
                  {message.length}/500
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 text-center font-medium"
                >
                  {error}
                </motion.p>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={!imageFile || !message.trim()}
                >
                  Enviar Postal
                </Button>
              </div>
            </div>

            {/* Safe area para mobile */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setError(null);
    setImageFile(file);

    // Preview
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError('Tomá una foto primero');
      return;
    }
    if (!message.trim()) {
      setError('Escribí un mensaje');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(imageFile, message.trim());
      // Limpiar y cerrar
      resetForm();
      onClose();
    } catch {
      setError('Error al subir la postal. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setMessage('');
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative z-10 w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Handle (mobile) */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="p-5 space-y-5">
              {/* Título */}
              <div className="text-center">
                <h2 className="text-xl font-display text-accent">
                  Nueva Postal
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Tomá una foto con la cumpleañera y dejá un mensaje
                </p>
              </div>

              {/* Zona de foto */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
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
                    {/* Botón para cambiar foto */}
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
                    className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-primary/40 bg-pink-50/50 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:border-primary/60 hover:bg-pink-50"
                  >
                    <span className="text-4xl">📸</span>
                    <span className="text-sm text-gray-500 font-medium">
                      Tomar foto / Elegir imagen
                    </span>
                  </motion.button>
                )}
              </div>

              {/* Mensaje */}
              <div className="space-y-1.5">
                <label
                  htmlFor="postcard-message"
                  className="text-xs text-gray-500 uppercase tracking-wider font-medium"
                >
                  Tu mensaje:
                </label>
                <textarea
                  id="postcard-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribí tu mensaje para Mile..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 font-serif italic text-gray-700 placeholder:text-gray-300 placeholder:not-italic"
                />
                <p className="text-[10px] text-gray-400 text-right">
                  {message.length}/500
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 text-center font-medium"
                >
                  {error}
                </motion.p>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={!imageFile || !message.trim()}
                >
                  Enviar Postal
                </Button>
              </div>
            </div>

            {/* Safe area para mobile */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
