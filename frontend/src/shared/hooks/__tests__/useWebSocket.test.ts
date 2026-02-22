import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'

// ─── MockWebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.OPEN
  onopen:    (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose:   ((event: { code: number; reason: string }) => void) | null = null
  onerror:   ((error: Event) => void) | null = null

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this)
    // Simulate async connection (fires after current microtask queue)
    setTimeout(() => this.onopen?.(), 0)
  }

  send = vi.fn()
  close = vi.fn((code = 1000, reason = '') => {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason })
  })

  /** Helper: trigger a disconnect without close() being called */
  simulateLostConnection(code = 1006) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason: 'Connection lost' })
  }

  static latest() {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('useWebSocket', () => {
  let originalWebSocket: typeof WebSocket

  beforeEach(() => {
    originalWebSocket = global.WebSocket
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket
    MockWebSocket.instances = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    global.WebSocket = originalWebSocket
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ─── connection lifecycle ───────────────────────────────────────────────────

  describe('connection', () => {
    it('creates a WebSocket connection on mount', () => {
      renderHook(() => useWebSocket('ws://localhost/ws', {}))
      expect(MockWebSocket.instances).toHaveLength(1)
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost/ws')
    })

    it('sets isConnected=true when the socket opens', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost/ws', {}))

      await act(async () => { vi.runAllTimers() })

      expect(result.current.isConnected).toBe(true)
    })

    it('calls onConnect callback when connected', async () => {
      const onConnect = vi.fn()
      renderHook(() => useWebSocket('ws://localhost/ws', { onConnect }))

      await act(async () => { vi.runAllTimers() })

      expect(onConnect).toHaveBeenCalledOnce()
    })
  })

  // ─── disconnection ──────────────────────────────────────────────────────────

  describe('disconnection', () => {
    it('closes the socket on unmount', async () => {
      const { unmount } = renderHook(() => useWebSocket('ws://localhost/ws', {}))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      unmount()

      expect(ws.close).toHaveBeenCalled()
    })

    it('sets isConnected=false after disconnect', async () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { reconnectAttempts: 0 })
      )

      await act(async () => { vi.runAllTimers() })
      expect(result.current.isConnected).toBe(true)

      act(() => { result.current.disconnect() })

      expect(result.current.isConnected).toBe(false)
    })

    it('calls onDisconnect callback when the socket closes', async () => {
      const onDisconnect = vi.fn()
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { onDisconnect, reconnectAttempts: 0 })
      )

      await act(async () => { vi.runAllTimers() })

      act(() => { result.current.disconnect() })

      expect(onDisconnect).toHaveBeenCalled()
    })
  })

  // ─── message handling ───────────────────────────────────────────────────────

  describe('message handling', () => {
    it('parses and delivers valid JSON messages to onMessage', async () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket('ws://localhost/ws', { onMessage }))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      act(() => {
        ws.onmessage?.({ data: JSON.stringify({ type: 'ranking_update', data: [] }) })
      })

      expect(onMessage).toHaveBeenCalledWith({ type: 'ranking_update', data: [] })
    })

    it('ignores non-JSON messages (e.g. ping)', async () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket('ws://localhost/ws', { onMessage }))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      act(() => { ws.onmessage?.({ data: 'ping' }) })

      expect(onMessage).not.toHaveBeenCalled()
    })

    it('ignores empty messages', async () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket('ws://localhost/ws', { onMessage }))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      act(() => { ws.onmessage?.({ data: '' }) })

      expect(onMessage).not.toHaveBeenCalled()
    })

    it('updates lastMessage on valid JSON message', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost/ws', {}))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      act(() => {
        ws.onmessage?.({ data: JSON.stringify({ type: 'test', data: 42 }) })
      })

      expect(result.current.lastMessage).toEqual({ type: 'test', data: 42 })
    })
  })

  // ─── sendMessage ────────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('sends a serialized JSON message when connected', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost/ws', {}))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      act(() => { result.current.sendMessage({ type: 'ping' }) })

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
    })
  })

  // ─── reconnection ───────────────────────────────────────────────────────────

  describe('reconnection', () => {
    it('attempts to reconnect after a lost connection', async () => {
      renderHook(() =>
        useWebSocket('ws://localhost/ws', {
          reconnectInterval: 1000,
          reconnectAttempts: 3,
        })
      )

      await act(async () => { vi.runAllTimers() })

      const instancesBefore = MockWebSocket.instances.length
      const ws = MockWebSocket.latest()

      act(() => { ws.simulateLostConnection() })

      await act(async () => { vi.advanceTimersByTime(1001) })

      expect(MockWebSocket.instances.length).toBeGreaterThan(instancesBefore)
    })

    it('does not reconnect after a manual disconnect', async () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', {
          reconnectInterval: 500,
          reconnectAttempts: 3,
        })
      )

      await act(async () => { vi.runAllTimers() })

      const instancesBefore = MockWebSocket.instances.length

      act(() => { result.current.disconnect() })

      await act(async () => { vi.advanceTimersByTime(1000) })

      // No new connection should have been created
      expect(MockWebSocket.instances.length).toBe(instancesBefore)
    })

    it('calls onError when the socket emits an error event', async () => {
      const onError = vi.fn()
      renderHook(() => useWebSocket('ws://localhost/ws', { onError }))

      await act(async () => { vi.runAllTimers() })

      const ws = MockWebSocket.latest()
      act(() => { ws.onerror?.(new Event('error')) })

      expect(onError).toHaveBeenCalled()
    })
  })
})
