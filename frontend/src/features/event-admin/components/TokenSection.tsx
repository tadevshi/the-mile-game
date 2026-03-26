import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, RefreshCw, Check, Link } from 'lucide-react';
import { useSecretBoxToken, useRegenerateSecretBoxToken } from '../hooks/useSecretBox';
import { Skeleton } from '@/shared/components/Skeleton';
import type { PreviewTheme } from '@/themes';

interface TokenSectionProps {
  slug: string;
  theme: PreviewTheme;
}

export function TokenSection({ slug, theme }: TokenSectionProps) {
  const { data, isLoading, error } = useSecretBoxToken(slug);
  const regenerateMutation = useRegenerateSecretBoxToken(slug);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const fullUrl = typeof window !== 'undefined' && data?.shareUrl
    ? `${window.location.origin}${data.shareUrl}`
    : data?.shareUrl ?? '';

  const handleCopy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!fullUrl) return;

    // Check if Web Share API is available (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Secret Box',
          text: '¡Mirá las sorpresas que tengo para ti! 🎁',
          url: fullUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error - fallback to copy
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }

    // Desktop fallback: copy to clipboard
    await handleCopy();
  };

  const handleRegenerate = () => {
    setShowRegenerateConfirm(true);
  };

  const confirmRegenerate = () => {
    regenerateMutation.mutate();
    setShowRegenerateConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Link para Compartir
          </h3>
        </div>
        <Skeleton height="48px" className="rounded-xl" />
        <div className="flex gap-2">
          <Skeleton width="120px" height="40px" className="rounded-full" />
          <Skeleton width="120px" height="40px" className="rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Link para Compartir
          </h3>
        </div>
        <div
          className="p-4 rounded-xl text-sm"
          style={{
            backgroundColor: `${theme.primaryColor}15`,
            border: `1px solid ${theme.primaryColor}30`,
            color: theme.textColor,
          }}
        >
          Error al cargar el token. Intenta refreshing la página.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Link className="w-5 h-5" style={{ color: theme.primaryColor }} />
        <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
          Link para Compartir
        </h3>
      </div>

      {/* URL Display */}
      <div
        className="p-3 rounded-xl border overflow-hidden"
        style={{
          backgroundColor: `${theme.secondaryColor}30`,
          borderColor: `${theme.secondaryColor}50`,
        }}
      >
        <p className="text-xs truncate text-ellipsis" style={{ color: `${theme.textColor}80` }}>
          {fullUrl}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Copy Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar Link
            </>
          )}
        </motion.button>

        {/* Share Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            backgroundColor: `${theme.primaryColor}20`,
            color: theme.primaryColor,
          }}
        >
          <Share2 className="w-4 h-4" />
          Compartir
        </motion.button>

        {/* Regenerate Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleRegenerate}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            backgroundColor: `${theme.accentColor}20`,
            color: theme.accentColor,
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Regenerar
        </motion.button>
      </div>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowRegenerateConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-sm w-full p-6 rounded-2xl shadow-xl"
            style={{ backgroundColor: 'white' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold mb-2" style={{ color: theme.textColor }}>
              ¿Regenerar token?
            </h4>
            <p className="text-sm mb-4" style={{ color: `${theme.textColor}80` }}>
              El link anterior dejará de funcionar. Los que tengan el link viejo no podrán ver la
              Secret Box.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${theme.textColor}20`, color: theme.textColor }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmRegenerate}
                disabled={regenerateMutation.isPending}
                className="px-4 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: theme.accentColor }}
              >
                {regenerateMutation.isPending ? 'Regenerando...' : 'Regenerar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
