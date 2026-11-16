import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const { mockHasAuthSession, mockRequestWsTicket, mockListPostcards } = vi.hoisted(() => ({
  mockHasAuthSession: vi.fn(), mockRequestWsTicket: vi.fn(), mockListPostcards: vi.fn(),
}))

vi.mock('@/shared/lib/api', () => ({
  api: {
    hasAuthSession: mockHasAuthSession,
    requestWsTicket: mockRequestWsTicket,
    listPostcardsScoped: mockListPostcards,
  },
}))

import { usePostcards } from '../usePostcards'
import { useWebSocketStore } from '@/shared/store/websocketStore'

/** Records the handshake of every socket the shared store opens. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static CLOSED = 3; static CLOSING = 2
  url: string
  protocols: string[]
  readyState = 0
  onopen: (() => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  constructor(url: string, protocols?: string[]) {
    this.url = url
    this.protocols = protocols ?? []
    FakeWebSocket.instances.push(this)
    queueMicrotask(() => this.onopen?.())
  }
  close(code = 1000, reason = '') {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }
}

const ticket = (value: string) => ({ ticket: value, expires_at: '2026-05-19T12:00:00Z', protocol: 'eventhub.v1' })

describe('usePostcards — WebSocket admission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    localStorage.setItem('auth-token', 'jwt-secret-value')
    mockHasAuthSession.mockReturnValue(true)
    mockRequestWsTicket.mockResolvedValue(ticket('TICKET-1'))
    mockListPostcards.mockResolvedValue([])
  })

  afterEach(() => {
    useWebSocketStore.getState().disconnect()
    useWebSocketStore.setState({ isConnected: false, isConnecting: false, socket: null, currentUrl: null, reconnectAttempts: 0, reconnectUrl: null })
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens the socket with the application and the ticket subprotocol, and no token in the URL', async () => {
    renderHook(() => usePostcards('ale-roy'))
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    const socket = FakeWebSocket.instances[0]
    expect(socket.protocols).toEqual(['eventhub.v1', 'ticket.TICKET-1'])
    expect(socket.url).toContain('event=ale-roy')
    expect(socket.url).not.toContain('jwt-secret-value')
  })

  it('opens the socket with only the application protocol without a usable ticket', async () => {
    mockRequestWsTicket.mockRejectedValue(new Error('boom'))
    renderHook(() => usePostcards('ale-roy'))
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    expect(FakeWebSocket.instances[0].protocols).toEqual(['eventhub.v1'])

    mockHasAuthSession.mockReturnValue(false)
    renderHook(() => usePostcards('otro-evento'))
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2))
    expect(FakeWebSocket.instances[1].protocols).toEqual(['eventhub.v1'])
    expect(mockRequestWsTicket).toHaveBeenCalledTimes(1)
  })

  it('reconnects when the page moves to another event', async () => {
    const { rerender } = renderHook(({ slug }) => usePostcards(slug), { initialProps: { slug: 'ale-roy' } })
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    expect(FakeWebSocket.instances[0].url).toContain('event=ale-roy')
    rerender({ slug: 'otro-evento' })
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2))
    expect(FakeWebSocket.instances[1].url).toContain('event=otro-evento')
  })

  it('renews the admission ticket when the socket reconnects', async () => {
    renderHook(() => usePostcards('ale-roy'))
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    mockRequestWsTicket.mockResolvedValue(ticket('TICKET-2'))
    act(() => { FakeWebSocket.instances[0].onclose?.({ code: 1006, reason: 'connection lost' }) })
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2), { timeout: 5000 })
    expect(mockRequestWsTicket).toHaveBeenCalledTimes(2)
    expect(FakeWebSocket.instances[1].protocols).toEqual(['eventhub.v1', 'ticket.TICKET-2'])
  })
})
