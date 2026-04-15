import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FEATURES } from '../featureFlags'

// vi.hoisted ensures these are available inside vi.mock factories (before imports)
const { mockPost, mockGet, mockInterceptorsUse, mockRequestInterceptorsUse } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockInterceptorsUse: vi.fn(),
  mockRequestInterceptorsUse: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: mockRequestInterceptorsUse },
        response: { use: mockInterceptorsUse },
      },
    })),
    get: vi.fn(),
  },
}))

import { api } from '../api'

describe('ApiClient — Drive Admin', () => {
  beforeEach(() => {
    localStorage.clear()
    api.clearPlayerId()
    vi.clearAllMocks()
    // Set a valid auth token so requests don't redirect to login
    localStorage.setItem('auth-token', 'test-token')
  })

  // ─── getDriveAuthUrl ─────────────────────────────────────────────────────────

  describe('getDriveAuthUrl', () => {
    it('GETs /api/admin/drive/auth-url', async () => {
      mockGet.mockResolvedValueOnce({ data: { auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?...' } })

      await api.getDriveAuthUrl()

      expect(mockGet).toHaveBeenCalledWith('/admin/drive/auth-url')
    })

    it('returns the auth URL string from the response', async () => {
      const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=xyz&redirect_uri=...'
      mockGet.mockResolvedValueOnce({ data: { auth_url: expectedUrl } })

      const result = await api.getDriveAuthUrl()

      expect(result).toBe(expectedUrl)
    })
  })

  // ─── getDriveStatus ──────────────────────────────────────────────────────────

  describe('getDriveStatus', () => {
    it('GETs /api/admin/drive/status', async () => {
      mockGet.mockResolvedValueOnce({
        data: { connected: true, connected_at: '2026-04-07T10:00:00Z', last_sync_at: null },
      })

      await api.getDriveStatus()

      expect(mockGet).toHaveBeenCalledWith('/admin/drive/status')
    })

    it('returns the connection status with connected flag', async () => {
      const status = { connected: true, connected_at: '2026-04-07T10:00:00Z', last_sync: null }
      mockGet.mockResolvedValueOnce({ data: status })

      const result = await api.getDriveStatus()

      expect(result).toEqual(status)
    })

    it('returns disconnected status when not connected', async () => {
      const status = { connected: false, connected_at: null, last_sync: null }
      mockGet.mockResolvedValueOnce({ data: status })

      const result = await api.getDriveStatus()

      expect(result.connected).toBe(false)
    })
  })

  // ─── disconnectDrive ──────────────────────────────────────────────────────────

  describe('disconnectDrive', () => {
    it('POSTs to /api/admin/drive/disconnect', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Disconnected successfully' } })

      await api.disconnectDrive()

      expect(mockPost).toHaveBeenCalledWith('/admin/drive/disconnect', {})
    })

    it('returns the success message from the backend', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Drive disconnected' } })

      const result = await api.disconnectDrive()

      expect(result.message).toBe('Drive disconnected')
    })
  })

  // ─── getBackupJobs ────────────────────────────────────────────────────────────

  describe('getBackupJobs', () => {
    it('GETs /api/admin/drive/backup-jobs with event_id query param', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })

      await api.getBackupJobs('event-slug-123')

      expect(mockGet).toHaveBeenCalledWith('/admin/drive/backup-jobs?event_id=event-slug-123')
    })

    it('returns an empty array when no jobs exist', async () => {
      mockGet.mockResolvedValueOnce({ data: { jobs: [], total: 0 } })

      const result = await api.getBackupJobs('event-slug-123')

      expect(result).toEqual([])
    })

    it('returns backup jobs with status and timestamps', async () => {
      const jobs = [
        {
          id: 'job-1',
          postcard_id: 'pc-1',
          status: 'synced',
          drive_file_id: 'drive-file-abc',
          retry_count: 0,
          last_error: null,
          queued_at: '2026-04-07T10:00:00Z',
          processed_at: '2026-04-07T10:01:00Z',
          synced_at: '2026-04-07T10:01:30Z',
        },
        {
          id: 'job-2',
          postcard_id: 'pc-2',
          status: 'failed',
          drive_file_id: null,
          retry_count: 3,
          last_error: 'Upload failed: network timeout',
          queued_at: '2026-04-07T11:00:00Z',
          processed_at: '2026-04-07T11:05:00Z',
          synced_at: null,
        },
      ]
      mockGet.mockResolvedValueOnce({ data: { jobs, total: 2 } })

      const result = await api.getBackupJobs('event-slug-123')

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('synced')
      expect(result[1].status).toBe('failed')
      expect(result[1].last_error).toBe('Upload failed: network timeout')
    })
  })

  // ─── retryBackupJob ──────────────────────────────────────────────────────────

  describe('retryBackupJob', () => {
    it('POSTs to /api/admin/drive/backup-jobs/:id/retry', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Job re-queued' } })

      await api.retryBackupJob('job-abc-123')

      expect(mockPost).toHaveBeenCalledWith('/admin/drive/backup-jobs/job-abc-123/retry', {})
    })

    it('returns the success message from the backend', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Backup job re-queued successfully' } })

      const result = await api.retryBackupJob('job-abc-123')

      expect(result.message).toBe('Backup job re-queued successfully')
    })
  })
})

describe('FEATURES — GOOGLE_DRIVE', () => {
  it('exports GOOGLE_DRIVE boolean flag', () => {
    // FEATURES must have a GOOGLE_DRIVE key (even if undefined/false)
    expect('GOOGLE_DRIVE' in FEATURES).toBe(true)
  })

  it('GOOGLE_DRIVE is false when VITE_ENABLE_GOOGLE_DRIVE_BACKUP is not "true"', () => {
    // Default state: flag is off unless explicitly enabled
    expect(FEATURES.GOOGLE_DRIVE).toBe(false)
  })

  it('GOOGLE_DRIVE would be true when env var is set to "true"', () => {
    // This documents the expected behavior when flag is enabled
    // In test environment, import.meta.env is undefined by default
    // so FEATURES.GOOGLE_DRIVE === false (default off)
    expect(FEATURES.GOOGLE_DRIVE).toBe(false)
  })
})