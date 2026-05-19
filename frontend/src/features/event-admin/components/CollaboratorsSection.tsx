import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCircle, Users, UserX, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { api, type Collaborator, type InviteTokenResponse } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { PreviewTheme } from '@/themes';

interface CollaboratorsSectionProps {
  slug: string;
  ownerId: string;
  theme: PreviewTheme;
}

export function CollaboratorsSection({ slug, ownerId, theme }: CollaboratorsSectionProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.id === ownerId;

  const [inviteData, setInviteData] = useState<InviteTokenResponse | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tokenRes, collabRes] = await Promise.all([
        api.getInviteToken(slug).catch(() => null),
        api.listCollaborators(slug).catch(() => [] as Collaborator[]),
      ]);
      if (tokenRes) setInviteData(tokenRes);
      setCollaborators(collabRes);
    } catch {
      setError('Error al cargar colaboradores');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateToken = async () => {
    if (!isOwner) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.regenerateInviteToken(slug);
      setInviteData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar invitación');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = async (userId: string) => {
    if (!isOwner) return;
    setRemovingId(userId);
    setError(null);
    try {
      await api.removeCollaborator(slug, userId);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar colaborador');
    } finally {
      setRemovingId(null);
    }
  };

  const surfaceBg = theme.backgroundStyle === 'dark' ? 'rgba(15, 23, 42, 0.5)' : `${theme.secondaryColor}30`;
  const borderColor = theme.backgroundStyle === 'dark' ? 'rgba(148, 163, 184, 0.2)' : `${theme.secondaryColor}50`;
  const mutedText = `${theme.textColor}80`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" style={{ color: theme.primaryColor }} />
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: mutedText }}>
          Colaboradores
        </h3>
      </div>

      <div
        className="rounded-xl p-4 border space-y-4"
        style={{ backgroundColor: surfaceBg, borderColor }}
      >
        {/* Invite Link */}
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: theme.textColor }}>
            Link de invitación
          </p>
          <p className="text-xs" style={{ color: mutedText }}>
            Compartí este link con quienes querés que administren el evento.
          </p>

          {inviteData ? (
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-xl px-4 py-3 text-sm truncate font-mono"
                style={{
                  backgroundColor: `${theme.primaryColor}15`,
                  color: theme.textColor,
                  border: `1px solid ${theme.primaryColor}30`,
                }}
              >
                {inviteData.share_url}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(inviteData.share_url)}
                icon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          ) : (
            <div className="text-sm" style={{ color: mutedText }}>
              {isLoading ? 'Cargando...' : 'No hay link de invitación'}
            </div>
          )}

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateToken}
              isLoading={isGenerating}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              {inviteData ? 'Regenerar link' : 'Generar link'}
            </Button>
          )}
        </div>

        {/* Collaborators List */}
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: theme.textColor }}>
            Administradores ({collaborators.length})
          </p>

          {collaborators.length === 0 ? (
            <p className="text-xs" style={{ color: mutedText }}>
              Todavía no hay colaboradores invitados.
            </p>
          ) : (
            <div className="space-y-2">
              {collaborators.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    backgroundColor: theme.backgroundStyle === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{
                        backgroundColor: `${theme.primaryColor}20`,
                        color: theme.primaryColor,
                      }}
                    >
                      {c.user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.textColor }}>
                        {c.user?.name || 'Usuario'}
                      </p>
                      <p className="text-xs" style={{ color: mutedText }}>
                        {c.user?.email}
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(c.user_id)}
                      disabled={removingId === c.user_id}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Eliminar colaborador"
                    >
                      {removingId === c.user_id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-red-500"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
