import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock framer-motion to avoid animation issues in test environment
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}))

// Mock the API module
vi.mock('@/shared/lib/api', () => ({
  api: {
    getDriveStatus: vi.fn(),
    getDriveAuthUrl: vi.fn(),
    disconnectDrive: vi.fn(),
  },
}))

import { api } from '@/shared/lib/api'
import { DriveConnectionPanel } from '../DriveConnectionPanel'

const mockGetDriveStatus = vi.mocked(api.getDriveStatus)
const mockGetDriveAuthUrl = vi.mocked(api.getDriveAuthUrl)
const mockDisconnectDrive = vi.mocked(api.disconnectDrive)

describe('DriveConnectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up location mock for redirect
    delete window.location
    window.location = { href: '' } as Location
  })

  // ─── Initial state: loading ──────────────────────────────────────────────────

  describe('initial render', () => {
    it('fetches Drive status on mount', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({ connected: false, connected_at: null, last_sync_at: null })

      render(<DriveConnectionPanel />)

      expect(mockGetDriveStatus).toHaveBeenCalledTimes(1)
    })

    it('shows disconnected badge when not connected', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({ connected: false, connected_at: null, last_sync_at: null })

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.getByText('No conectada')).toBeInTheDocument()
      })
    })

    it('shows connected badge when Drive is connected', async () => {
      const connectedAt = new Date('2026-04-07T10:00:00Z').toISOString()
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: connectedAt,
        last_sync_at: null,
      })

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.getByText('Cuenta conectada')).toBeInTheDocument()
      })
    })

    it('shows error badge when status fetch fails', async () => {
      mockGetDriveStatus.mockRejectedValueOnce(new Error('Network error'))

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })
    })
  })

  // ─── Connect flow ────────────────────────────────────────────────────────────

  describe('connect flow', () => {
    it('shows Connect button when disconnected', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({ connected: false, connected_at: null, last_sync_at: null })

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /conectar google drive/i })).toBeInTheDocument()
      })
    })

    it('redirects to Google OAuth URL when Connect is clicked', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({ connected: false, connected_at: null, last_sync_at: null })
      const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=xyz'
      mockGetDriveAuthUrl.mockResolvedValueOnce(oauthUrl)

      render(<DriveConnectionPanel />)

      const connectBtn = await screen.findByRole('button', { name: /conectar google drive/i })
      fireEvent.click(connectBtn)

      expect(mockGetDriveAuthUrl).toHaveBeenCalledTimes(1)
      expect(window.location.href).toBe(oauthUrl)
    })

    it('sets loading state while fetching auth URL', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({ connected: false, connected_at: null, last_sync_at: null })
      mockGetDriveAuthUrl.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<DriveConnectionPanel />)

      const connectBtn = await screen.findByRole('button', { name: /conectar google drive/i })
      fireEvent.click(connectBtn)

      // Button should show loading state (isLoading)
      await waitFor(() => {
        expect(connectBtn).toBeDisabled()
      })
    })

    it('shows error and restores state when auth URL fetch fails', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({ connected: false, connected_at: null, last_sync_at: null })
      mockGetDriveAuthUrl.mockRejectedValueOnce(new Error('Failed to get auth URL'))

      render(<DriveConnectionPanel />)

      const connectBtn = await screen.findByRole('button', { name: /conectar google drive/i })
      fireEvent.click(connectBtn)

      await waitFor(() => {
        expect(screen.getByText(/no se pudo iniciar la conexión/i)).toBeInTheDocument()
      })
    })
  })

  // ─── Disconnect flow ────────────────────────────────────────────────────────

  describe('disconnect flow', () => {
    it('shows Disconnect button when connected', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync_at: null,
      })

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /desconectar/i })).toBeInTheDocument()
      })
    })

    it('asks for confirmation before disconnecting', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync_at: null,
      })
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<DriveConnectionPanel />)

      const disconnectBtn = await screen.findByRole('button', { name: /desconectar/i })
      fireEvent.click(disconnectBtn)

      expect(confirmSpy).toHaveBeenCalledWith('¿Desconectar Google Drive? Las fotos que ya están respaldadas en Drive no se eliminarán.')
      expect(mockDisconnectDrive).not.toHaveBeenCalled()
    })

    it('calls disconnectDrive and updates state when confirmed', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync_at: null,
      })
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockDisconnectDrive.mockResolvedValueOnce({ message: 'Disconnected successfully' })

      render(<DriveConnectionPanel />)

      const disconnectBtn = await screen.findByRole('button', { name: /desconectar/i })
      fireEvent.click(disconnectBtn)

      await waitFor(() => {
        expect(mockDisconnectDrive).toHaveBeenCalledTimes(1)
        expect(screen.getByText('No conectada')).toBeInTheDocument()
      })
    })

    it('shows error and restores connected state when disconnect fails', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync_at: null,
      })
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockDisconnectDrive.mockRejectedValueOnce(new Error('Failed to disconnect'))

      render(<DriveConnectionPanel />)

      const disconnectBtn = await screen.findByRole('button', { name: /desconectar/i })
      fireEvent.click(disconnectBtn)

      await waitFor(() => {
        expect(screen.getByText(/no se pudo desconectar/i)).toBeInTheDocument()
        // State should restore to connected
        expect(screen.getByText('Cuenta conectada')).toBeInTheDocument()
      })
    })

    it('calls onDisconnect callback after successful disconnect', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync_at: null,
      })
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockDisconnectDrive.mockResolvedValueOnce({ message: 'Disconnected successfully' })

      const onDisconnect = vi.fn()
      render(<DriveConnectionPanel onDisconnect={onDisconnect} />)

      const disconnectBtn = await screen.findByRole('button', { name: /desconectar/i })
      fireEvent.click(disconnectBtn)

      await waitFor(() => {
        expect(onDisconnect).toHaveBeenCalledTimes(1)
      })
    })
  })

  // ─── Display info ────────────────────────────────────────────────────────────

  describe('display info', () => {
    it('shows last sync time when available', async () => {
      const lastSync = new Date('2026-04-07T14:30:00Z').toISOString()
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date('2026-04-07T10:00:00Z').toISOString(),
        last_sync_at: lastSync,
      })

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.getByText(/último respaldo:/i)).toBeInTheDocument()
      })
    })

    it('does not show last sync when null', async () => {
      mockGetDriveStatus.mockResolvedValueOnce({
        connected: true,
        connected_at: new Date().toISOString(),
        last_sync_at: null,
      })

      render(<DriveConnectionPanel />)

      await waitFor(() => {
        expect(screen.queryByText(/último respaldo:/i)).not.toBeInTheDocument()
      })
    })
  })
})
