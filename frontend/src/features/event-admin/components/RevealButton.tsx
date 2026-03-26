import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertTriangle, X } from 'lucide-react';
import { useSecretPostcards, useRevealSecretBox } from '../hooks/useSecretBox';
import { Skeleton } from '@/shared/components/Skeleton';
import type { PreviewTheme } from '@/themes';

interface RevealButtonProps {
  slug: string;
  theme: PreviewTheme;
}

export function RevealButton({ slug, theme }: RevealButtonProps) {
  const { data, isLoading, error } = useSecretPostcards(slug);
  const revealMutation = useRevealSecretBox(slug);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const pendingPostcards = useMemo(() => {
    if (!data?.postcards) return [];
    return data.postcards.filter((p) => !p.revealed_at);
  }, [data?.postcards]);

  const handleReveal = async () => {
    try {
      await revealMutation.mutateAsync();
      setShowConfirm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reveal:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Revelar Secret Box
          </h3>
        </div>
        <Skeleton height="56px" className="rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  if (data.revealed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Secret Box
          </h3>
        </div>
        <div
          className="p-4 rounded-xl text-center"
          style={{
            backgroundColor: `${theme.primaryColor}15`,
            border: `1px solid ${theme.primaryColor}30`,
          }}
        >
          <p className="text-sm font-medium" style={{ color: theme.textColor }}>
            ¡Secret Box ya fue revelada! 🎉
          </p>
          <p className="text-xs mt-1" style={{ color: `${theme.textColor}60` }}>
            Todas las postales secretas ya están visibles en la cartelera.
          </p>
        </div>
      </div>
    );
  }

  if (pendingPostcards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Revelar Secret Box
          </h3>
        </div>
        <div
          className="p-4 rounded-xl text-center"
          style={{
            backgroundColor: `${theme.secondaryColor}30`,
            border: `1px solid ${theme.secondaryColor}50`,
          }}
        >
          <p className="text-sm" style={{ color: `${theme.textColor}60` }}>
            No hay postales secretas pendientes por revelar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5" style={{ color: theme.primaryColor }} />
        <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
          Revelar Secret Box
        </h3>
      </div>

      {/* Big Reveal Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowConfirm(true)}
        className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
        }}
      >
        <Sparkles className="w-5 h-5" />
        Revelar Secret Box ({pendingPostcards.length})
      </motion.button>

      <p className="text-xs text-center" style={{ color: `${theme.textColor}60` }}>
        Al revelar, todas las postales secretas aparecerán en la cartelera de todos los dispositivos
        conectados.
      </p>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm w-full rounded-2xl shadow-xl overflow-hidden"
              style={{ backgroundColor: 'white' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Confirmar</span>
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-sm mb-4" style={{ color: theme.textColor }}>
                  Se revelarán <strong>{pendingPostcards.length}</strong> postales secretas:
                </p>

                {/* Postcards list */}
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                  {pendingPostcards.map((postcard) => (
                    <div
                      key={postcard.id}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ backgroundColor: `${theme.secondaryColor}30` }}
                    >
                      <span className="text-lg">🎁</span>
                      <span className="text-sm font-medium" style={{ color: theme.textColor }}>
                        {postcard.sender_name || 'Anónimo'}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs mb-4" style={{ color: `${theme.textColor}60` }}>
                  Esta acción no se puede deshacer. Las postales aparecerán en la cartelera de todos
                  los dispositivos conectados.
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${theme.textColor}20`,
                      color: theme.textColor,
                    }}
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReveal}
                    disabled={revealMutation.isPending}
                    className="flex-1 py-2 rounded-full text-sm font-bold text-white disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
                    }}
                  >
                    {revealMutation.isPending ? 'Revelando...' : '¡Revelar!'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
            style={{ backgroundColor: theme.primaryColor, color: 'white' }}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">¡Secret Box revelado!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
