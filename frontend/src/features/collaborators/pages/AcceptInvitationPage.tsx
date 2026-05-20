import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const params = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const slug = params.slug || '';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const acceptedRef = useRef(false);

  const hasToken = !!token;
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    hasToken ? 'loading' : 'error'
  );
  const [message, setMessage] = useState(
    hasToken ? '' : 'El link de invitación no es válido. Falta el token.'
  );

  useEffect(() => {
    if (!isAuthenticated) {
      const returnTo = encodeURIComponent(`/join/${slug}?token=${token}`);
      navigate(`/login?return_to=${returnTo}`);
      return;
    }

    if (!hasToken || acceptedRef.current) return;
    acceptedRef.current = true;

    api
      .acceptInvitation(token)
      .then((res) => {
        setStatus('success');
        setMessage(`¡Te uniste a "${res.event.name}"!`);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.error || 'No se pudo unir al evento. El link puede haber expirado.');
      });
  }, [isAuthenticated, hasToken, token, slug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FFF5F7' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full rounded-3xl shadow-xl border p-8 text-center"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#EC489920' }}
          >
            {status === 'loading' ? (
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <Users className="w-8 h-8 text-pink-500" />
            )}
          </div>
        </div>

        <h1 className="text-2xl font-display text-gray-900 mb-2">
          {status === 'loading'
            ? 'Uniendo al evento...'
            : status === 'success'
            ? '¡Listo!'
            : status === 'error'
            ? 'Ups, algo salió mal'
            : 'Invitación'}
        </h1>

        {message && (
          <p className="text-sm text-gray-600 mb-6">{message}</p>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Link inválido o expirado</span>
          </div>
        )}

        {status === 'success' && (
          <p className="text-xs text-gray-400 mt-4">Redirigiendo al dashboard...</p>
        )}
      </motion.div>
    </div>
  );
}
