import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link2, Unlink, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/shared';
import { api, type DriveStatus } from '@/shared/lib/api';

interface DriveConnectionPanelProps {
  /** Called after a successful disconnect */
  onDisconnect?: () => void;
}

type ConnectionState = 'idle' | 'loading' | 'connected' | 'disconnected' | 'error';

const STATUS_LABELS: Record<string, string> = {
  connected: 'Cuenta conectada',
  disconnected: 'No conectada',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Drive connection panel for event admin settings.
 * Shows the current Google Drive connection state and allows the organizer
 * to connect or disconnect their Drive account.
 *
 * NOTE: This component only renders when VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true.
 * The parent should guard with FEATURES.GOOGLE_DRIVE.
 */
export function DriveConnectionPanel({ onDisconnect }: DriveConnectionPanelProps) {
  const [state, setState] = useState<ConnectionState>('idle');
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Use ref to track initialization without triggering re-renders
  const initRef = useRef<{ fetched: boolean }>({ fetched: false });

  // Fetch connection status on mount
  useEffect(() => {
    if (initRef.current.fetched) return;
    initRef.current.fetched = true;

    api.getDriveStatus()
      .then((data) => {
        setStatus(data);
        setState(data.connected ? 'connected' : 'disconnected');
      })
      .catch(() => {
        console.error('Failed to load Drive status');
        setError('No se pudo obtener el estado de conexión.');
        setState('error');
      });
  }, []);

  const handleConnect = async () => {
    setState('loading');
    setError(null);

    try {
      const url = await api.getDriveAuthUrl();
      // Redirect to Google OAuth consent screen
      window.location.href = url;
    } catch {
      console.error('Failed to get Drive auth URL');
      setError('No se pudo iniciar la conexión con Google Drive.');
      setState('error');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar Google Drive? Las fotos que ya están respaldadas en Drive no se eliminarán.')) {
      return;
    }

    setState('loading');
    setError(null);

    try {
      await api.disconnectDrive();
      setStatus({ connected: false, connected_at: null, last_sync: null });
      setState('disconnected');
      onDisconnect?.();
    } catch {
      console.error('Failed to disconnect Drive');
      setError('No se pudo desconectar Google Drive. Intenta de nuevo.');
      setState('connected'); // Restore previous state
    }
  };

  const isLoading = state === 'loading';

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white/60 backdrop-blur-sm rounded-xl border border-[var(--color-secondary)]">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.416 6.643L17.853 17.63H29.29L40.727 6.643H6.416Z" fill="#0066DA"/>
            <path d="M40.727 29.27H29.29L17.853 40.258L6.416 29.27H17.853L29.29 40.258" fill="#00AC47"/>
            <path d="M40.727 29.27H29.29L17.853 40.258L6.416 29.27H17.853L29.29 40.258" fill="#EA4335"/>
            <path d="M40.727 29.27H29.29L17.853 40.258L6.416 29.27H17.853L29.29 40.258" fill="#00832D"/>
          </svg>
        </div>
        <div>
          <h3 className="font-display text-base text-gray-800">Google Drive</h3>
          <p className="text-xs text-gray-500">Respaldar fotos y videos automáticamente</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        {state === 'connected' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
            <CheckCircle2 size={12} />
            {STATUS_LABELS.connected}
          </span>
        ) : state === 'disconnected' || state === 'idle' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full border border-gray-200">
            <Unlink size={12} />
            {STATUS_LABELS.disconnected}
          </span>
        ) : state === 'error' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-200">
            <AlertCircle size={12} />
            Error
          </span>
        ) : null}

        {status?.connected_at && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={10} />
            desde {formatDate(status.connected_at)}
          </span>
        )}
      </div>

      {/* Last sync */}
      {status?.last_sync && (
        <p className="text-xs text-gray-500">
          Último respaldo: <span className="text-gray-700">{formatDate(status.last_sync)}</span>
        </p>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {state === 'disconnected' || state === 'idle' || state === 'error' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConnect}
            isLoading={isLoading}
            icon={<Link2 size={14} />}
          >
            Conectar Google Drive
          </Button>
        ) : state === 'connected' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            isLoading={isLoading}
            icon={<Unlink size={14} />}
          >
            Desconectar
          </Button>
        ) : null}
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-400">
        Las fotos y videos de la cartelera se respaldan automáticamente en tu Google Drive. No se comparten con nadie.
      </p>
    </section>
  );
}