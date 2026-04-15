import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BackupJobsList } from '../BackupJobsList'

// Mock the API module
vi.mock('@/shared/lib/api', () => ({
  api: {
    getBackupJobs: vi.fn(),
    retryBackupJob: vi.fn(),
  },
}))

import { api } from '@/shared/lib/api'

const mockGetBackupJobs = vi.mocked(api.getBackupJobs)
const mockRetryBackupJob = vi.mocked(api.retryBackupJob)

const FAKE_EVENT_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('BackupJobsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Loading state ───────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows loading spinner while fetching jobs', () => {
      mockGetBackupJobs.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      expect(screen.getByText(/cargando respaldos/i)).toBeInTheDocument()
    })
  })

  // ─── Empty state ───────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty message when no jobs exist', async () => {
      mockGetBackupJobs.mockResolvedValueOnce([])

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText('Aún no hay respaldos')).toBeInTheDocument()
      })
    })

    it('shows descriptive empty message about adding photos', async () => {
      mockGetBackupJobs.mockResolvedValueOnce([])

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText(/agregar fotos o videos/i)).toBeInTheDocument()
      })
    })
  })

  // ─── Error state ────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockGetBackupJobs.mockRejectedValueOnce(new Error('Network error'))

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText(/no se pudieron cargar los respaldos/i)).toBeInTheDocument()
      })
    })
  })

  // ─── Jobs list ──────────────────────────────────────────────────────────────

  describe('jobs list display', () => {
    const fakeJobs = [
      {
        id: 'job-1',
        postcard_id: 'pc-1',
        status: 'queued' as const,
        drive_file_id: null,
        retry_count: 0,
        last_error: null,
        queued_at: '2026-04-07T10:00:00Z',
        processed_at: null,
        synced_at: null,
      },
      {
        id: 'job-2',
        postcard_id: 'pc-2',
        status: 'synced' as const,
        drive_file_id: 'drive-file-abc',
        retry_count: 0,
        last_error: null,
        queued_at: '2026-04-07T11:00:00Z',
        processed_at: '2026-04-07T11:01:00Z',
        synced_at: '2026-04-07T11:01:30Z',
      },
      {
        id: 'job-3',
        postcard_id: 'pc-3',
        status: 'failed' as const,
        drive_file_id: null,
        retry_count: 3,
        last_error: 'Upload failed: network timeout',
        queued_at: '2026-04-07T12:00:00Z',
        processed_at: '2026-04-07T12:05:00Z',
        synced_at: null,
      },
    ]

    it('renders all jobs with correct status badges', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(fakeJobs)

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText('En cola')).toBeInTheDocument()
        expect(screen.getByText('Respaldado')).toBeInTheDocument()
        expect(screen.getByText('Fallido')).toBeInTheDocument()
      })
    })

    it('shows retry button only for failed jobs', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(fakeJobs)

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        const retryButtons = screen.getAllByRole('button', { name: /reintentar/i })
        expect(retryButtons).toHaveLength(1)
      })
    })

    it('shows queued timestamp for queued jobs', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(fakeJobs)

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText(/en cola desde/i)).toBeInTheDocument()
      })
    })

    it('shows synced timestamp for synced jobs', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(fakeJobs)

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText(/respaldado/i)).toBeInTheDocument()
      })
    })

    it('shows error message for failed jobs with last_error', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(fakeJobs)

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText(/error: upload failed/i)).toBeInTheDocument()
      })
    })

    it('shows processed timestamp for failed jobs without last_error', async () => {
      const jobsWithoutError = [
        {
          id: 'job-4',
          postcard_id: 'pc-4',
          status: 'failed' as const,
          drive_file_id: null,
          retry_count: 3,
          last_error: null,
          queued_at: '2026-04-07T12:00:00Z',
          processed_at: '2026-04-07T12:05:00Z',
          synced_at: null,
        },
      ]
      mockGetBackupJobs.mockResolvedValueOnce(jobsWithoutError)

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText(/falló/i)).toBeInTheDocument()
      })
    })
  })

  // ─── Retry flow ─────────────────────────────────────────────────────────────

  describe('retry flow', () => {
    const failedJob = [
      {
        id: 'job-retry',
        postcard_id: 'pc-retry',
        status: 'failed' as const,
        drive_file_id: null,
        retry_count: 3,
        last_error: 'Upload failed: network timeout',
        queued_at: '2026-04-07T12:00:00Z',
        processed_at: '2026-04-07T12:05:00Z',
        synced_at: null,
      },
    ]

    it('calls retryBackupJob with correct job ID when retry is clicked', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(failedJob)
      mockRetryBackupJob.mockResolvedValueOnce({ message: 'Job re-queued' })

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      const retryBtn = await screen.findByRole('button', { name: /reintentar/i })
      fireEvent.click(retryBtn)

      expect(mockRetryBackupJob).toHaveBeenCalledWith('job-retry')
    })

    it('refreshes the job list after successful retry', async () => {
      mockGetBackupJobs
        .mockResolvedValueOnce(failedJob)
        .mockResolvedValueOnce([]) // After retry, empty list

      mockRetryBackupJob.mockResolvedValueOnce({ message: 'Job re-queued' })

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      const retryBtn = await screen.findByRole('button', { name: /reintentar/i })
      fireEvent.click(retryBtn)

      await waitFor(() => {
        // After retry, the list should refresh
        expect(mockGetBackupJobs).toHaveBeenCalledTimes(2)
      })
    })

    it('shows loading state on retry button while retrying', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(failedJob)
      mockRetryBackupJob.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      const retryBtn = await screen.findByRole('button', { name: /reintentar/i })
      fireEvent.click(retryBtn)

      await waitFor(() => {
        expect(retryBtn).toBeDisabled()
      })
    })

    it('shows error message when retry fails', async () => {
      mockGetBackupJobs.mockResolvedValueOnce(failedJob)
      mockRetryBackupJob.mockRejectedValueOnce(new Error('Retry failed'))

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      const retryBtn = await screen.findByRole('button', { name: /reintentar/i })
      fireEvent.click(retryBtn)

      await waitFor(() => {
        expect(screen.getByText(/no se pudo reintentar el respaldo/i)).toBeInTheDocument()
      })
    })
  })

  // ─── Refresh ────────────────────────────────────────────────────────────────

  describe('manual refresh', () => {
    it('has a refresh button that re-fetches jobs', async () => {
      mockGetBackupJobs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          id: 'job-new',
          postcard_id: 'pc-new',
          status: 'queued' as const,
          drive_file_id: null,
          retry_count: 0,
          last_error: null,
          queued_at: new Date().toISOString(),
          processed_at: null,
          synced_at: null,
        }])

      render(<BackupJobsList eventId={FAKE_EVENT_ID} />)

      await waitFor(() => {
        expect(screen.getByText('Aún no hay respaldos')).toBeInTheDocument()
      })

      const refreshBtn = screen.getByRole('button', { name: /actualizar/i })
      fireEvent.click(refreshBtn)

      await waitFor(() => {
        expect(screen.getByText('En cola')).toBeInTheDocument()
      })
    })
  })

  // ─── Event ID prop ──────────────────────────────────────────────────────────

  describe('eventId prop', () => {
    it('fetches jobs for the specified event ID', async () => {
      mockGetBackupJobs.mockResolvedValueOnce([])

      const specificEventId = 'event-specific-123'
      render(<BackupJobsList eventId={specificEventId} />)

      await waitFor(() => {
        expect(mockGetBackupJobs).toHaveBeenCalledWith(specificEventId)
      })
    })

    it('re-fetches when eventId changes', async () => {
      mockGetBackupJobs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          id: 'job-event-2',
          postcard_id: 'pc-event-2',
          status: 'queued' as const,
          drive_file_id: null,
          retry_count: 0,
          last_error: null,
          queued_at: new Date().toISOString(),
          processed_at: null,
          synced_at: null,
        }])

      const { rerender } = render(<BackupJobsList eventId="event-1" />)

      await waitFor(() => {
        expect(screen.getByText('Aún no hay respaldos')).toBeInTheDocument()
      })

      rerender(<BackupJobsList eventId="event-2" />)

      await waitFor(() => {
        expect(screen.getByText('En cola')).toBeInTheDocument()
      })
    })
  })
})
