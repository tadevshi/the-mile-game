import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared';
import { useEventStore } from '@/shared/store/eventStore';
import { useTheme } from '@/shared/theme';

type MediaMode = 'photo' | 'video';

interface AddPostcardSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, message: string, senderName?: string) => Promise<void>;
  initialSenderName?: string;
  requireSenderName?: boolean;
}

const MAX_VIDEO_DURATION = 30; // segundos

export function AddPostcardSheet({
  isOpen,
  onClose,
  onSubmit,
  initialSenderName = '',
  requireSenderName = false,
}: AddPostcardSheetProps) {
  const currentEvent = useEventStore((state) => state.currentEvent);
  const { currentTheme } = useTheme();

  const colors = {
    primary: currentTheme.primaryColor || '#D22E7F',
    text: currentTheme.textColor || '#1E293B',
  };

  const [mediaMode, setMediaMode] = useState<MediaMode>('photo');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState(initialSenderName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video recording refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'opening' | 'active' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraInfo, setCameraInfo] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  useEffect(() => {
    setSenderName(initialSenderName);
  }, [initialSenderName]);

  const honoreeLabel = currentEvent?.name?.trim() || 'este evento';

  const getSupportedVideoMimeType = () => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }

    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const getMediaAccessError = (err: unknown) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'La cámara en vivo necesita HTTPS o localhost. Podés seguir subiendo un archivo desde tu galería.';
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Este navegador no soporta cámara en vivo desde esta pantalla. Probá subiendo un archivo.';
    }

    const errorName = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
    switch (errorName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'No nos diste permiso para usar la cámara. Revisá los permisos del navegador o subí un archivo desde tu galería.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No encontramos una cámara disponible en este dispositivo.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'La cámara está siendo usada por otra app o no se pudo iniciar correctamente.';
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return 'Tu cámara no soporta la configuración solicitada. Probá nuevamente o subí un archivo desde tu galería.';
      case 'SecurityError':
        return 'La cámara requiere un contexto seguro (HTTPS o localhost).';
      default:
        return 'No se pudo acceder a la cámara. Probá subiendo un archivo desde tu galería.';
    }
  };

  const stopCamera = useCallback((nextStatus: 'idle' | 'error' = 'idle') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setCameraStatus(nextStatus);
    setCameraInfo(null);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (!window.isSecureContext) {
        setError('La cámara en vivo necesita HTTPS o localhost. Podés seguir subiendo un archivo desde tu galería.');
        setCameraStatus('error');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no soporta cámara en vivo desde esta pantalla. Probá subiendo un archivo.');
        setCameraStatus('error');
        return;
      }

      stopCamera();
      setCameraStatus('opening');
      setError(null);

      let stream: MediaStream;

      if (mediaMode === 'video') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'user' } },
            audio: true,
          });
          setCameraInfo('Cámara y micrófono activos. Tu video se grabará con sonido.');
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'user' } },
            audio: false,
          });
          setCameraInfo('No pudimos activar el micrófono. Podés grabar igual, pero el video se guardará sin audio.');
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' } },
          audio: false,
        });
        setCameraInfo(null);
      }

      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      setError(getMediaAccessError(err));
      stopCamera('error');
    }
  }, [mediaMode, stopCamera]);

  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    const stream = streamRef.current;
    let cancelled = false;

    video.srcObject = stream;

    const attachPreview = async () => {
      try {
        await video.play();

        if (cancelled) return;

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== 'live') {
          throw new Error('track-not-live');
        }

        setCameraStatus('active');
        setError(null);
      } catch {
        if (cancelled) return;
        setError('No pudimos iniciar la vista previa de la cámara. Probá de nuevo o subí un archivo.');
        stopCamera('error');
      }
    };

    void attachPreview();

    return () => {
      cancelled = true;
    };
  }, [isCameraActive, stopCamera]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    if (typeof MediaRecorder === 'undefined') {
      setError('Tu navegador no soporta grabación en vivo. Podés subir un video desde tu galería.');
      return;
    }

    const stream = streamRef.current;
    recordedChunksRef.current = [];

    const supportedMimeType = mediaMode === 'video' ? getSupportedVideoMimeType() : '';
    const options = supportedMimeType ? { mimeType: supportedMimeType } : undefined;

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || supportedMimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType,
        });
        const url = URL.createObjectURL(blob);
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const recordedFile = new File([blob], `postcard-${Date.now()}.${extension}`, { type: mimeType });
        setMediaFile(recordedFile);
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
      setError('No se pudo grabar el video en este navegador. Probá subiendo un archivo desde tu galería.');
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
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleSubmit = async () => {
    if (!mediaFile) {
      setError(mediaMode === 'video' ? 'Grabá un video primero' : 'Tomá una foto primero');
      return;
    }
    if (requireSenderName && !senderName.trim()) {
      setError('Escribí tu nombre para poder publicar la postal');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(mediaFile, message.trim(), senderName.trim() || undefined);
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
    setSenderName(initialSenderName);
    setError(null);
    setMediaMode('photo');
    setIsRecording(false);
    setRecordingTime(0);
    setIsCameraActive(false);
    setCameraInfo(null);
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
          className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
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
            className="relative z-10 w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white rounded-t-3xl md:rounded-2xl shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Handle (mobile) */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: `${colors.primary}40` }} />
            </div>

            <div className="space-y-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {/* Título */}
              <div className="text-center">
                <h2 className="text-xl font-display" style={{ color: colors.primary }}>
                  Nueva Postal
                </h2>
                {/* Modo toggle */}
                <div className="flex justify-center gap-2 mt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeToggle('photo')}
                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={mediaMode === 'photo' ? { backgroundColor: `${colors.primary}20`, color: colors.primary } : { backgroundColor: `${colors.primary}10`, color: `${colors.text}80` }}
                  >
                    📷 Foto
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeToggle('video')}
                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={mediaMode === 'video' ? { backgroundColor: `${colors.primary}20`, color: colors.primary } : { backgroundColor: `${colors.primary}10`, color: `${colors.text}80` }}
                  >
                    🎬 Video
                  </motion.button>
                </div>
                <p className="text-xs mt-1" style={{ color: `${colors.text}80` }}>
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
                  style={{ color: `${colors.text}80` }}
                >
                  Tu nombre:{requireSenderName && <span className="ml-1" style={{ color: colors.primary }}>*</span>}
                </label>
                <input
                  id="postcard-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="¿Cómo te llamás?"
                  maxLength={100}
                  className="w-full px-0 py-2 bg-transparent border-b-2 text-sm focus:outline-none text-gray-700 rounded-none"
                  style={{ borderColor: `${colors.primary}30` }}
                />
                {requireSenderName && (
                  <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: colors.primary }}>
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
                      <div className="absolute top-3 left-3 text-xs px-2 py-1 rounded flex items-center gap-1" style={{ backgroundColor: colors.primary, color: 'white' }}>
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
                        style={{ borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` }}
                      >
                        <span className="text-4xl">📸</span>
                        <span className="text-sm font-medium" style={{ color: `${colors.text}80` }}>
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
                             {cameraStatus === 'opening' && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white text-sm">
                                 Iniciando cámara...
                               </div>
                             )}
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
                                  aria-label="Empezar grabación"
                                >
                                  <span className="text-2xl">●</span>
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={stopRecording}
                                  className="w-14 h-14 rounded-full bg-white text-red-500 flex items-center justify-center shadow-lg"
                                  aria-label="Detener grabación"
                                >
                                  <span className="text-xl">■</span>
                                </motion.button>
                              )}
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => stopCamera()}
                                className="w-10 h-10 rounded-full bg-white/80 text-gray-700 flex items-center justify-center"
                                aria-label="Cerrar cámara"
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
                              style={{ backgroundColor: colors.primary }}
                            >
                              <span>📹</span>
                              <span>Activar cámara</span>
                            </motion.button>
                            <p className="text-xs" style={{ color: `${colors.text}50` }}>
                              O elegí un video de tu galería
                            </p>
                            {cameraInfo && (
                              <p className="max-w-xs text-center text-[11px]" style={{ color: `${colors.text}65` }}>
                                {cameraInfo}
                              </p>
                            )}
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => fileInputRef.current?.click()}
                              className="text-sm underline"
                              style={{ color: colors.primary }}
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

              {/* Mensaje opcional */}
              <div className="space-y-1.5">
                <label
                  htmlFor="postcard-message"
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: `${colors.text}80` }}
                >
                  Tu mensaje (opcional):
                </label>
                <textarea
                  id="postcard-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Escribí tu mensaje para ${honoreeLabel} o dejalo vacío para subir solo una foto/video...`}
                  maxLength={500}
                  rows={3}
                  className="w-full px-0 py-2.5 bg-transparent border-b-2 text-sm resize-none focus:outline-none font-serif italic text-gray-700 placeholder:text-gray-400 placeholder:not-italic rounded-none"
                  style={{ borderColor: `${colors.primary}30` }}
                />
                <p className="text-[10px] text-right" style={{ color: `${colors.text}40` }}>
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
                  disabled={!mediaFile || (requireSenderName && !senderName.trim())}
                >
                  Enviar Postal
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
