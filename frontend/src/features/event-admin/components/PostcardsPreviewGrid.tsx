import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gift, Clock } from 'lucide-react';
import { useSecretPostcards } from '../hooks/useSecretBox';
import { Skeleton } from '@/shared/components/Skeleton';
import type { PreviewTheme } from '@/themes';
import type { Postcard } from '@features/postcards/types/postcards.types';

interface PostcardsPreviewGridProps {
  slug: string;
  theme: PreviewTheme;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Hace un momento';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function isNewerThan24Hours(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < 24;
}

interface PostcardCardProps {
  postcard: Postcard;
  theme: PreviewTheme;
}

function PostcardCard({ postcard, theme }: PostcardCardProps) {
  const isNew = isNewerThan24Hours(postcard.created_at);
  const displayName = postcard.sender_name || 'Anónimo';
  const imagePath = postcard.thumbnail_path || postcard.image_path;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      <div
        className="rounded-xl overflow-hidden border-2"
        style={{
          backgroundColor: `${theme.secondaryColor}30`,
          borderColor: `${theme.secondaryColor}50`,
          transform: `rotate(${postcard.rotation || 0}deg)`,
        }}
      >
        {/* Image */}
        <div className="aspect-square bg-gray-100 relative">
          {postcard.media_type === 'video' && postcard.thumbnail_path ? (
            <img
              src={postcard.thumbnail_path}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : imagePath ? (
            <img
              src={imagePath}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gift className="w-12 h-12" style={{ color: theme.primaryColor }} />
            </div>
          )}

          {/* New Badge */}
          {isNew && (
            <div
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: theme.accentColor }}
            >
              Nueva
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-lg">🎁</span>
            <span className="text-xs font-medium truncate" style={{ color: theme.textColor }}>
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: `${theme.textColor}60` }}>
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(postcard.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PostcardsPreviewGrid({ slug, theme }: PostcardsPreviewGridProps) {
  const { data, isLoading, error } = useSecretPostcards(slug);

  const pendingPostcards = useMemo(() => {
    if (!data?.postcards) return [];
    return data.postcards.filter((p) => !p.revealed_at);
  }, [data?.postcards]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Postales Recibidas
          </h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height="120px" className="rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
            Postales Recibidas
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
          Error al cargar postales. Intenta refreshing.
        </div>
      </div>
    );
  }

  const isEmpty = pendingPostcards.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-5 h-5" style={{ color: theme.primaryColor }} />
        <h3 className="text-base font-semibold" style={{ color: theme.textColor }}>
          Postales Recibidas
        </h3>
        {pendingPostcards.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {pendingPostcards.length}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div
          className="p-6 rounded-xl text-center"
          style={{
            backgroundColor: `${theme.secondaryColor}30`,
            border: `1px solid ${theme.secondaryColor}50`,
          }}
        >
          <Gift className="w-10 h-10 mx-auto mb-2" style={{ color: `${theme.primaryColor}60` }} />
          <p className="text-sm font-medium mb-1" style={{ color: theme.textColor }}>
            Aún no hay postales secretas
          </p>
          <p className="text-xs" style={{ color: `${theme.textColor}60` }}>
            Compartí el link para que familiares y amigos envíen sus mensajes 🎁
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {pendingPostcards.slice(0, 12).map((postcard) => (
            <PostcardCard key={postcard.id} postcard={postcard} theme={theme} />
          ))}
        </div>
      )}

      {pendingPostcards.length > 12 && (
        <p className="text-xs text-center" style={{ color: `${theme.textColor}60` }}>
          Mostrando 12 de {pendingPostcards.length} postales
        </p>
      )}
    </div>
  );
}
