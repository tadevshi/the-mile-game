import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared';
import type { Postcard, SecretBoxStatus } from '@features/postcards/types/postcards.types';

// Importar textura de corcho
import corkTexture from '@/assets/cartelera.png';

type AdminState = 'loading' | 'unauthorized' | 'ready' | 'confirming' | 'revealing' | 'revealed' | 'error';

export function AdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [state, setState] = useState<AdminState>('loading');
  const [status, setStatus] = useState<SecretBoxStatus | null>(null);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setState('unauthorized');
      return;
    }

    try {
      const [statusData, postcardData] = await Promise.all([
        api.getSecretBoxStatus(),
        api.listSecretPostcards(),
      ]);
      setStatus(statusData);
      setPostcards(postcardData);
      setState(statusData.revealed ? 'revealed' : 'ready');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } };
      if (axiosErr.response?.status === 401) {
        setState('unauthorized');
      } else {
        setErrorMsg('No se pudo conectar al servidor.');
        setState('error');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

  const handleReveal = async () => {
    setState('revealing');
    try {
      const result = await api.revealSecretBox();
      setPostcards(result.postcards);
      setStatus((prev) => prev ? { ...prev, revealed: true } : null);
      setState('revealed');
    } catch {
      setErrorMsg('Error al revelar la Secret Box. Intentá de nuevo.');
      setState('error');
    }
  };

  return (
    <div className="min-h-screen relative flex items-start justify-center px-4 py-8">
      {/* Fondo de corcho */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${corkTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none bg-black/50" />

      <div className="w-full max-w-2xl space-y-5">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display text-white drop-shadow-lg">
            Panel Admin
          </h1>
          <p className="text-white/70 text-sm mt-1">Secret Box — The Mile Game</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Loading ── */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              className="bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.p
                className="text-4xl"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              >
                ⚙️
              </motion.p>
              <p className="text-gray-500 mt-3 text-sm">Verificando acceso...</p>
            </motion.div>
          )}

          {/* ── Unauthorized ── */}
          {state === 'unauthorized' && (
            <motion.div
              key="unauth"
              className="bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center space-y-3"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-5xl">🔒</p>
              <h2 className="text-xl font-display text-red-500">Acceso denegado</h2>
              <p className="text-gray-600 text-sm">
                Debes iniciar sesión para acceder al panel de administración.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Iniciar Sesión
              </Button>
            </motion.div>
          )}

          {/* ── Error ── */}
          {state === 'error' && (
            <motion.div
              key="error"
              className="bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center space-y-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <p className="text-5xl">⚠️</p>
              <p className="text-gray-700 text-sm">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={loadData}>
                Reintentar
              </Button>
            </motion.div>
          )}

          {/* ── Ready ── */}
          {(state === 'ready' || state === 'confirming' || state === 'revealing') && status && (
            <motion.div
              key="ready"
              className="space-y-5"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            >
              {/* Status Card */}
              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                      Postales secretas
                    </p>
                    <p className="text-4xl font-bold text-accent mt-1">
                      {status.total}
                    </p>
                  </div>
                  <motion.p
                    className="text-5xl"
                    animate={state === 'revealing' ? { scale: [1, 1.3, 1], rotate: [0, -15, 15, 0] } : {}}
                    transition={{ repeat: state === 'revealing' ? Infinity : 0, duration: 0.6 }}
                  >
                    🎁
                  </motion.p>
                </div>

                <div className="border-t pt-4">
                  {state !== 'confirming' && state !== 'revealing' && (
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      onClick={() => setState('confirming')}
                      disabled={status.total === 0}
                    >
                      🎁 REVELAR SECRET BOX
                    </Button>
                  )}

                  {status.total === 0 && state !== 'confirming' && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                      No hay postales secretas cargadas todavía.
                    </p>
                  )}

                  {/* Confirmación */}
                  <AnimatePresence>
                    {state === 'confirming' && (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                          <p className="text-sm font-medium text-amber-800">
                            ⚠️ Esta acción es irreversible
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Todas las {status.total} postales secretas se revelarán a TODOS los dispositivos conectados al corkboard simultáneamente.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="md"
                            fullWidth
                            onClick={() => setState('ready')}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            onClick={handleReveal}
                          >
                            Sí, ¡REVELAR!
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {state === 'revealing' && (
                      <motion.div
                        className="text-center py-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <p className="text-sm text-gray-600 font-medium">
                          Revelando la Secret Box... 🎉
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Preview de postales secretas */}
              {postcards.length > 0 && (
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 space-y-4">
                  <h2 className="font-display text-lg text-accent">
                    Preview de postales ({postcards.length})
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {postcards.map((pc) => (
                      <motion.div
                        key={pc.id}
                        className="rounded-xl overflow-hidden border border-[var(--color-secondary)] shadow-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="aspect-[4/3] bg-gray-100">
                          <img
                            src={pc.image_path}
                            alt={pc.player_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            🎁 {pc.player_name}
                          </p>
                          {pc.message && (
                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 italic">
                              "{pc.message}"
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Already Revealed ── */}
          {state === 'revealed' && (
            <motion.div
              key="revealed"
              className="space-y-5"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center space-y-4">
                <motion.p
                  className="text-5xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 3, duration: 0.5, delay: 0.2 }}
                >
                  🎉
                </motion.p>
                <h2 className="text-2xl font-display text-accent">
                  ¡Secret Box revelada!
                </h2>
                {status?.revealed_at && (
                  <p className="text-gray-500 text-sm">
                    Revelada el {new Date(status.revealed_at).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                <p className="text-gray-600 text-sm">
                  Las {postcards.length} postales ya están visibles en la cartelera. ✨
                </p>
              </div>

              {/* Preview (modo read-only) */}
              {postcards.length > 0 && (
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 space-y-4">
                  <h2 className="font-display text-lg text-accent">
                    Postales reveladas ({postcards.length})
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {postcards.map((pc) => (
                      <div
                        key={pc.id}
                        className="rounded-xl overflow-hidden border border-[var(--color-secondary)] shadow-sm"
                      >
                        <div className="aspect-[4/3] bg-gray-100">
                          <img
                            src={pc.image_path}
                            alt={pc.player_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            🎁 {pc.player_name}
                          </p>
                          {pc.message && (
                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 italic">
                              "{pc.message}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
