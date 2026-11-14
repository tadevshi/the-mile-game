import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { api } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';

type InvitationStatus = 'loading' | 'success' | 'error';

export function GuestInvitationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const acceptedRef = useRef(false);
  const [status, setStatus] = useState<InvitationStatus>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'El link no contiene un token de invitación.',
  );

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El link no contiene un token de invitación.');
      return;
    }

    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/login?return_to=${encodeURIComponent(returnTo)}`, { replace: true });
      return;
    }

    if (acceptedRef.current) return;
    acceptedRef.current = true;
    setStatus('loading');

    api.acceptGuestInvitation(token)
      .then(() => {
        setStatus('success');
        setMessage('Ya formas parte del evento como invitado. No podés administrar el evento.');
      })
      .catch((error: { response?: { data?: { error?: string } } }) => {
        setStatus('error');
        setMessage(
          error?.response?.data?.error || 'No se pudo aceptar la invitación. El link puede haber sido rotado.',
        );
      });
  }, [isAuthenticated, location.pathname, location.search, navigate, token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-secondary)] to-[var(--color-bg)]">
      <motion.section
        aria-labelledby="guest-invitation-heading"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-white/50 bg-white/80 p-8 text-center shadow-xl backdrop-blur-sm"
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary)]/30">
            {status === 'loading' ? (
              <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            ) : status === 'success' ? (
              <CheckCircle aria-hidden="true" className="h-8 w-8 text-green-500" />
            ) : (
              <AlertCircle aria-hidden="true" className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>

        <h1 id="guest-invitation-heading" className="mb-2 text-2xl font-display text-gray-900">
          {status === 'loading'
            ? 'Preparando tu invitación…'
            : status === 'success'
              ? '¡Ya estás invitado!'
              : 'No pudimos aceptar la invitación'}
        </h1>

        {message && (
          <p role={status === 'error' ? 'alert' : 'status'} aria-live="polite" className="mb-6 text-sm text-gray-600">
            {message}
          </p>
        )}

        {status === 'success' && (
          <Button
            size="lg"
            onClick={() => navigate(`/e/${encodeURIComponent(slug)}`)}
            icon={<UserPlus aria-hidden="true" className="h-5 w-5" />}
          >
            Ir al evento
          </Button>
        )}
      </motion.section>
    </div>
  );
}
