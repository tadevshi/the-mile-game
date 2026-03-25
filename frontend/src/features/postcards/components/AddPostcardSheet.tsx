import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared';
import { useQuizStore } from '@features/quiz/store/quizStore';
import { api } from '@/shared/lib/api';
import type { Theme } from '@/shared/theme/ThemeProvider';

type MediaMode = 'photo' | 'video';

interface AddPostcardSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, message: string, senderName?: string) => Promise<void>;
  theme?: Theme;
}

const MAX_VIDEO_DURATION = 30; // segundos

export function AddPostcardSheet({ isOpen, onClose, onSubmit, theme }: AddPostcardSheetProps) {
  const playerName = useQuizStore((s) => s.playerName);

  // Theme colors with fallbacks
  const primaryColor = theme?.primaryColor || '#EC4899';
  const textColor = theme?.textColor || '#1E293B';

  // Guest mode: el usuario llegó a la cartelera sin haber hecho el quiz.
  const [isGuest, setIsGuest] = useState(!api.getPlayerId());

  const [mediaMode, setMediaMode] = useState<MediaMode>('photo');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState(playerName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video recording refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: mediaMode === 'video',
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara');
    }
  }, [mediaMode]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    recordedChunksRef.current = [];

    const options = mediaMode === 'video'
      ? { mimeType: 'video/webm;codecs=vp9' }
      : undefined;

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mediaMode === 'video' ? 'video/webm' : 'image/webp',
        });
        const url = URL.createObjectURL(blob);
        setMediaFile(blob as unknown as File);
        setMediaPreview(url);
        stopCamera();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_VIDEO_DURATION - 1) {
            stopRecording();
            return MAX_VIDEO_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('No se pudo grabar. Probá con otro navegador.');
    }
  }, [mediaMode, stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

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
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleSubmit = async () => {
    if (!mediaFile) {
      setError(mediaMode === 'video' ? 'Grabá un video primero' : 'Tomá una foto primero');
      return;
    }
    if (!message.trim()) {
      setError('Escribí un mensaje');
      return;
    }
    if (isGuest && !senderName.trim()) {
      setError('Escribí tu nombre para poder publicar la postal');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(mediaFile, message.trim(), senderName.trim() || undefined);
      if (isGuest && api.getPlayerId()) {
        setIsGuest(false);
      }
      resetForm();
      onClose();
    } catch {
      setError('Error al subir la postal. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMessage('');
    setSenderName(playerName);
    setError(null);
    setMediaMode('photo');
    setIsRecording(false);
    setRecordingTime(0);
    setIsCameraActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    stopCamera();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleModeToggle = (mode: MediaMode) => {
    if (mode !== mediaMode) {
      setMediaMode(mode);
      setMediaFile(null);
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
      setIsRecording(false);
      setRecordingTime(0);
      stopCamera();
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
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: `${primaryColor}40` }} />
            </div>

            <div className="p-5 space-y-4">
              {/* Título */}
              <div className="text-center">
                <h2 className="text-xl font-display" style={{ color: primaryColor }}>
                  Nueva Postal
                </h2>
                {/* Modo toggle */}
                <div className="flex justify-center gap-2 mt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeToggle('photo')}
                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={mediaMode === 'photo' ? { backgroundColor: `${primaryColor}20`, color: primaryColor } : { backgroundColor: `${primaryColor}10`, color: `${textColor}80` }}
                  >
                    📷 Foto
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeToggle('video')}
                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={mediaMode === 'video' ? { backgroundColor: `${primaryColor}20`, color: primaryColor } : { backgroundColor: `${primaryColor}10`, color: `${textColor}80` }}
                  >
                    🎬 Video
                  </motion.button>
                </div>
                <p className="text-xs mt-1" style={{ color: `${textColor}80` }}>
                  {mediaMode === 'photo'
                    ? 'Tomá una foto y dejá un mensaje'
                    : 'Grabá un video de hasta 30 segundos'}
                </p>
              </div>

              {/* Nombre del remitente */}
              <div className="space-y-1">
                <label
                  htmlFor="postcard-sender"
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: `${textColor}80` }}
                >
                  Tu nombre:{isGuest && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
                </label>
                <input
                  id="postcard-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="¿Cómo te llamás?"
                  maxLength={100}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none text-gray-700"
                  style={{ borderColor: `${primaryColor}30` }}
                />
                {isGuest && (
                  <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: primaryColor }}>
                    <span>📌</span>
                    <span>Vas a quedar registrado/a en la cartelera automáticamente</span>
                  </p>
                )}
              </div>

              {/* Zona de foto/video */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaMode === 'video' ? 'video/*' : 'image/*'}
                  capture={mediaMode === 'photo' ? 'user' : undefined}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {mediaPreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                    {mediaMode === 'video' && mediaFile?.type.startsWith('video/') ? (
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
                    {/* Botón para cambiar */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium shadow-lg cursor-pointer"
                    >
                      {mediaMode === 'video' ? '🎬' : '📷'} Cambiar
                    </motion.button>
                    {/* Video indicator */}
                    {mediaMode === 'video' && mediaFile?.type.startsWith('video/') && (
                      <div className="absolute top-3 left-3 text-xs px-2 py-1 rounded flex items-center gap-1" style={{ backgroundColor: primaryColor, color: 'white' }}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                        VIDEO
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Modo foto */}
                    {mediaMode === 'photo' ? (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
                        style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }}
                      >
                        <span className="text-4xl">📸</span>
                        <span className="text-sm font-medium" style={{ color: `${textColor}80` }}>
                          Tomar foto / Elegir imagen
                        </span>
                      </motion.button>
                    ) : (
                      /* Modo video con cámara en vivo */
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-900">
                        {isCameraActive ? (
                          <>
                            <video
                              ref={videoRef}
                              className="w-full h-full object-cover mirror"
                              playsInline
                              muted
                            />
                            {/* Timer overlay */}
                            <div className="absolute top-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded-full font-mono">
                              {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:
                              {String(recordingTime % 60).padStart(2, '0')} /
                              {MAX_VIDEO_DURATION}s
                            </div>
                            {/* Recording indicator */}
                            {isRecording && (
                              <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                REC
                              </div>
                            )}
                            {/* Controls */}
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-4">
                              {!isRecording ? (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={startRecording}
                                  className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                                >
                                  <span className="text-2xl">●</span>
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={stopRecording}
                                  className="w-14 h-14 rounded-full bg-white text-red-500 flex items-center justify-center shadow-lg"
                                >
                                  <span className="text-xl">■</span>
                                </motion.button>
                              )}
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={stopCamera}
                                className="w-10 h-10 rounded-full bg-white/80 text-gray-700 flex items-center justify-center"
                              >
                                ✕
                              </motion.button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={startCamera}
                              className="px-6 py-3 text-white rounded-full font-medium shadow-lg flex items-center gap-2"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <span>📹</span>
                              <span>Activar cámara</span>
                            </motion.button>
                            <p className="text-xs" style={{ color: `${textColor}50` }}>
                              O elegí un video de tu galería
                            </p>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => fileInputRef.current?.click()}
                              className="text-sm underline"
                              style={{ color: primaryColor }}
                            >
                              Seleccionar archivo
                            </motion.button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Mensaje */}
              <div className="space-y-1.5">
                <label
                  htmlFor="postcard-message"
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: `${textColor}80` }}
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
                  className="w-full px-3 py-2.5 border rounded-xl text-sm resize-none focus:outline-none font-serif italic text-gray-700 placeholder:text-gray-400 placeholder:not-italic"
                  style={{ borderColor: `${primaryColor}30` }}
                />
                <p className="text-[10px] text-right" style={{ color: `${textColor}40` }}>
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
                  disabled={!mediaFile || !message.trim() || (isGuest && !senderName.trim())}
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
