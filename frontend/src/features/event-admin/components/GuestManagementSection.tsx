import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Copy, RefreshCw, UserX, Users } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { api, type EventGuest, type InviteTokenResponse } from '@/shared/lib/api';
import type { PreviewTheme } from '@/themes';

interface GuestManagementSectionProps {
  slug: string;
  theme: PreviewTheme;
}

export function GuestManagementSection({ slug, theme }: GuestManagementSectionProps) {
  const [inviteData, setInviteData] = useState<InviteTokenResponse | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [inviteResult, guestsResult] = await Promise.allSettled([
      api.getGuestInviteToken(slug),
      api.listGuests(slug),
    ]);

    const errors: string[] = [];
    if (inviteResult.status === 'fulfilled') {
      setInviteData(inviteResult.value);
    } else {
      errors.push('No se pudo cargar el link de invitados.');
    }
    if (guestsResult.status === 'fulfilled') {
      setGuests(guestsResult.value);
    } else {
      errors.push('No se pudo cargar la lista de invitados.');
    }
    if (errors.length > 0) setError(errors.join(' '));
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCopyLink = async () => {
    if (!inviteData) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(inviteData.share_url);
      setCopied(true);
      setError(null);
    } catch {
      setError('No se pudo copiar el link. Seleccionalo y copialo manualmente.');
    }
  };

  const handleRotateLink = async () => {
    if (!window.confirm('El link anterior dejará de aceptar invitados nuevos. Los invitados actuales conservarán su membresía. ¿Rotar el link?')) {
      return;
    }

    setIsRotating(true);
    setError(null);
    setCopied(false);
    try {
      const rotated = await api.rotateGuestInviteToken(slug);
      setInviteData(rotated);
    } catch {
      setError('No se pudo confirmar la rotación. Recargá el link antes de compartirlo.');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRemoveGuest = async (guest: EventGuest) => {
    const displayName = guest.user?.name || guest.user?.email || 'este invitado';
    if (!window.confirm(`¿Quitar a ${displayName} del evento? Su cuenta no se eliminará.`)) return;

    setRemovingId(guest.user_id);
    setError(null);
    try {
      await api.removeGuest(slug, guest.user_id);
      setGuests((current) => current.filter((item) => item.user_id !== guest.user_id));
    } catch {
      setError('No se pudo quitar al invitado. La lista se mantiene sin cambios.');
    } finally {
      setRemovingId(null);
    }
  };

  const surfaceBg = theme.backgroundStyle === 'dark' ? 'rgba(15, 23, 42, 0.5)' : `${theme.secondaryColor}30`;
  const borderColor = theme.backgroundStyle === 'dark' ? 'rgba(148, 163, 184, 0.2)' : `${theme.secondaryColor}50`;
  const mutedText = `${theme.textColor}80`;

  return (
    <section aria-labelledby="guest-management-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Users aria-hidden="true" className="h-4 w-4" style={{ color: theme.primaryColor }} />
        <h3
          id="guest-management-heading"
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: mutedText }}
        >
          Invitados
        </h3>
      </div>

      <div className="space-y-4 rounded-xl border p-4" style={{ backgroundColor: surfaceBg, borderColor }}>
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: theme.textColor }}>Link para invitados</p>
          <p className="text-xs" style={{ color: mutedText }}>
            Quienes acepten con su cuenta podrán participar, pero no administrar el evento.
          </p>

          {inviteData ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <code
                className="min-w-0 flex-1 break-all rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: `${theme.primaryColor}15`,
                  color: theme.textColor,
                  border: `1px solid ${theme.primaryColor}30`,
                }}
              >
                {inviteData.share_url}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                icon={copied ? <CheckCircle aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
              >
                {copied ? 'Copiado' : 'Copiar link'}
              </Button>
            </div>
          ) : (
            <p className="text-sm" style={{ color: mutedText }}>
              {isLoading ? 'Cargando link de invitados…' : 'Link no disponible.'}
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRotateLink}
            isLoading={isRotating}
            icon={<RefreshCw aria-hidden="true" className="h-4 w-4" />}
          >
            {inviteData ? 'Rotar link' : 'Generar link'}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: theme.textColor }}>
            Invitados aceptados ({guests.length})
          </p>
          {isLoading && guests.length === 0 ? (
            <p className="text-xs" style={{ color: mutedText }}>Cargando invitados…</p>
          ) : guests.length === 0 ? (
            <p className="text-xs" style={{ color: mutedText }}>Todavía no se sumó ningún invitado.</p>
          ) : (
            <ul className="space-y-2">
              {guests.map((guest) => {
                const displayName = guest.user?.name || 'Usuario';
                return (
                  <li
                    key={guest.user_id}
                    className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between"
                    style={{ backgroundColor: theme.backgroundStyle === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255,255,255,0.6)' }}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium" style={{ color: theme.textColor }}>{displayName}</p>
                      <p className="break-all text-xs" style={{ color: mutedText }}>{guest.user?.email || guest.user_id}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 shrink-0"
                      onClick={() => void handleRemoveGuest(guest)}
                      isLoading={removingId === guest.user_id}
                      icon={<UserX aria-hidden="true" className="h-4 w-4 text-red-500" />}
                    >
                      Quitar <span className="sr-only">invitado {displayName}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <div role="alert" className="space-y-2 text-xs text-red-500">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadData()} isLoading={isLoading}>
              Reintentar carga
            </Button>
          </div>
        )}
        <p role="status" aria-live="polite" className="sr-only">{copied ? 'Link copiado.' : ''}</p>
      </div>
    </section>
  );
}
