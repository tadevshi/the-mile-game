import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared';
import { api, type BackupJob } from '@/shared/lib/api';

interface BackupJobsListProps {
  /** Slug of the event being managed */
  eventSlug: string;
}

/** Maps backup status to display label and icon */
const STATUS_CONFIG: Record<BackupJob['status'], { label: string; icon: typeof CheckCircle2; color: string }> = {
  queued: { label: 'En cola', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  in_progress: { label: 'Subiendo', icon: Loader2, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  synced: { label: 'Respaldado', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  failed: { label: 'Fallido', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Shows a list of backup jobs for the current event's postcards.
 * Displays status, timestamps, error messages, and a Retry button for failed jobs.
 *
 * NOTE: This component only renders when VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true.
 */
export function BackupJobsList({ eventSlug }: BackupJobsListProps) {
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const fetchJobs = () => {
    setIsLoading(true);
    setError(null);

    api.getBackupJobs(eventSlug)
      .then((data) => {
        setJobs(data);
        setIsLoading(false);
      })
      .catch(() => {
        console.error('Failed to fetch backup jobs');
        setError('No se pudieron cargar los respaldos.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, [eventSlug]);

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await api.retryBackupJob(jobId);
      // Refresh the list
      fetchJobs();
    } catch {
      console.error('Failed to retry backup job');
      setError('No se pudo reintentar el respaldo.');
    } finally {
      setRetryingJobId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Cargando respaldos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-40">
          <rect x="8" y="6" width="32" height="36" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="14" y1="16" x2="34" y2="16" stroke="currentColor" strokeWidth="2"/>
          <line x1="14" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="2"/>
          <line x1="14" y1="32" x2="22" y2="32" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <p className="text-sm">Aún no hay respaldos</p>
        <p className="text-xs mt-1">Los respaldos aparecerán aquí cuando se agreguen fotos o videos a la cartelera.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-gray-700">Historial de respaldos</h4>
        <button
          onClick={fetchJobs}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={12} />
          Actualizar
        </button>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const cfg = STATUS_CONFIG[job.status];
          const StatusIcon = cfg.icon;
          const isRetrying = retryingJobId === job.id;

          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-[var(--color-secondary)]"
            >
              {/* Status badge */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}>
                <StatusIcon size={11} />
                {cfg.label}
              </div>

              {/* Timestamps */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  {job.status === 'queued' && `En cola desde ${formatDate(job.queued_at)}`}
                  {job.status === 'in_progress' && `Subiendo desde ${formatDate(job.queued_at)}`}
                  {job.status === 'synced' && `Respaldado ${formatDate(job.synced_at)}`}
                  {job.status === 'failed' && job.last_error && (
                    <span className="text-red-600">Error: {job.last_error}</span>
                  )}
                  {job.status === 'failed' && !job.last_error && (
                    <span className="text-gray-500">Falló {formatDate(job.processed_at)}</span>
                  )}
                </p>
              </div>

              {/* Retry button for failed jobs */}
              {job.status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetry(job.id)}
                  isLoading={isRetrying}
                  icon={<RefreshCw size={12} />}
                >
                  Reintentar
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}