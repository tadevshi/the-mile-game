import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lock, LogIn, ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { buildLoginUrl } from '@/shared/lib/api';
import { useTheme } from '@/shared/theme';

/**
 * Tipo de fallo de acceso a un evento privado.
 * - `private`: el visitante no tiene identidad (401) → puede iniciar sesión.
 * - `denied`: la cuenta existe pero no es invitada del evento (403).
 */
export type PrivateEventViewKind = 'private' | 'denied';

interface PrivateEventViewProps {
  /** Qué tipo de fallo de acceso se está mostrando */
  kind: PrivateEventViewKind;
  /** Nombre del evento, cuando se conoce */
  eventName?: string;
  /** Slug del evento, para apuntar a la invitación de invitado */
  slug?: string;
}

/**
 * Vista de evento privado / acceso denegado.
 *
 * El login conserva el destino actual en el parámetro `return_to`
 * (mismo canal que usa la invitación de invitado de MR2), de modo que el
 * visitante vuelve a la página que estaba viendo.
 */
export function PrivateEventView({ kind, eventName, slug }: PrivateEventViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ slug?: string }>();
  const { currentTheme: theme } = useTheme();

  const eventSlug = slug ?? params.slug ?? '';
  const destination = `${location.pathname}${location.search}`;
  // El canal único del retorno: el parámetro `return_to` de la página de login.
  const loginPath = buildLoginUrl(destination);
  const invitationPath = eventSlug ? `/guest-join/${eventSlug}` : '';

  const isPrivate = kind === 'private';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: theme.bgColor
          ? theme.bgColor
          : 'linear-gradient(to bottom, #fdf9f3, #faf6f0, #f5f1eb)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card variant="glass" padding="lg" className="text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${theme.primaryColor}15` }}
          >
            {isPrivate ? (
              <Lock aria-hidden="true" className="h-8 w-8" style={{ color: theme.primaryColor }} />
            ) : (
              <ShieldAlert aria-hidden="true" className="h-8 w-8" style={{ color: theme.primaryColor }} />
            )}
          </div>

          {eventName && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textColor }}>
              {t('privateEvent.eventNameLabel')}{' '}
              <span>{eventName}</span>
            </p>
          )}

          <h1
            className="mb-3 text-2xl font-bold"
            style={{ color: theme.primaryColor, fontFamily: `var(--font-display)` }}
          >
            {isPrivate ? t('privateEvent.privateTitle') : t('privateEvent.deniedTitle')}
          </h1>

          <p className="mb-6 text-sm" style={{ color: theme.textColor }}>
            {isPrivate ? t('privateEvent.privateDescription') : t('privateEvent.deniedDescription')}
          </p>

          {isPrivate && (
            <Button
              size="lg"
              fullWidth
              className="mb-6"
              icon={<LogIn aria-hidden="true" className="h-5 w-5" />}
              onClick={() => navigate(loginPath)}
            >
              {t('privateEvent.login')}
            </Button>
          )}

          {invitationPath && (
            <div
              className="rounded-2xl px-4 py-3 text-left"
              style={{ backgroundColor: `${theme.secondaryColor}33` }}
            >
              <p className="text-sm" style={{ color: theme.textColor }}>
                {t('privateEvent.invitationHint')}
              </p>
              <p
                className="mt-2 break-all font-mono text-xs"
                style={{ color: theme.primaryColor }}
                data-testid="private-event-invitation-path"
              >
                {invitationPath}
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
