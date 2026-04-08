import { useCallback, useEffect, useState } from 'react'
import { api, type BackupJob } from '@/shared/lib/api'

interface UseBackupJobsResult {
  jobs: BackupJob[]
  isLoading: boolean
  error: string | null
  retryingJobId: string | null
  refreshJobs: () => Promise<void>
  retryJob: (jobId: string) => Promise<void>
}

export function useBackupJobs(eventId: string): UseBackupJobsResult {
  const [jobs, setJobs] = useState<BackupJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)

  const refreshJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.getBackupJobs(eventId)
      setJobs(data)
    } catch {
      console.error('Failed to fetch backup jobs')
      setError('No se pudieron cargar los respaldos.')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  const retryJob = useCallback(async (jobId: string) => {
    setRetryingJobId(jobId)
    try {
      await api.retryBackupJob(jobId)
      await refreshJobs()
    } catch {
      console.error('Failed to retry backup job')
      setError('No se pudo reintentar el respaldo.')
    } finally {
      setRetryingJobId(null)
    }
  }, [refreshJobs])

  useEffect(() => {
    void refreshJobs()
  }, [refreshJobs])

  return {
    jobs,
    isLoading,
    error,
    retryingJobId,
    refreshJobs,
    retryJob,
  }
}
