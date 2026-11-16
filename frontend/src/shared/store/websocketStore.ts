import { create } from 'zustand';
import { api } from '@/shared/lib/api';

/** Application subprotocol of the EventHub WebSocket handshake. */
export const WS_APP_PROTOCOL = 'eventhub.v1';

/** Prefix of the admission ticket subprotocol (`ticket.<value>`). */
export const WS_TICKET_PROTOCOL_PREFIX = 'ticket.';

/** The subprotocols offered: the application one, plus the admission ticket. */
export function buildWsProtocols(ticket?: string | null): string[] {
  return ticket ? [WS_APP_PROTOCOL, `${WS_TICKET_PROTOCOL_PREFIX}${ticket}`] : [WS_APP_PROTOCOL];
}

/** Protocols offered to the handshake, ready or minted per attempt. */
export type WsProtocols = string[] | (() => string[] | Promise<string[]>);

/**
 * The provider both event hooks use: it mints an admission ticket over the
 * authenticated surface when there is a session, and offers the application
 * protocol alone when there is none or the request fails.
 */
export function createEventProtocols(eventSlug?: string): () => Promise<string[]> {
  return async () => {
    if (!eventSlug || !api.hasAuthSession()) return buildWsProtocols();
    const ticket = await api.requestWsTicket(eventSlug).catch(() => null);
    return buildWsProtocols(ticket?.ticket);
  };
}

export interface WebSocketMessage {
  type: string;
  data?: unknown;
  postcard?: unknown;
  postcards?: unknown;
  ranking?: unknown;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastMessage: WebSocketMessage | null;

  // Internal connection instance
  socket: WebSocket | null;

  // Current URL for multi-endpoint support
  currentUrl: string | null;

  // Reconnection state
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  reconnectUrl: string | null;

  // Subscribers
  subscribers: Set<MessageHandler>;

  // Actions
  connect: (url: string, protocols?: WsProtocols) => void;
  disconnect: () => void;
  sendMessage: (message: unknown) => void;
  subscribe: (handler: MessageHandler) => () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Protocols of the last connection, kept so a reconnect re-mints them.
  let protocolsRef: WsProtocols | undefined;
  // Guards against a slower connection attempt overwriting a newer one.
  let connectSeq = 0;

  const handleReconnect = (url: string) => {
    const state = get();
    if (state.reconnectAttempts >= state.maxReconnectAttempts) {
      console.log('[WebSocket Store] Max reconnection attempts reached');
      return;
    }

    const attempt = state.reconnectAttempts + 1;
    // Exponential backoff with jitter: cap at 30s, add random jitter
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt)) + Math.random() * 1000;

    set({ reconnectAttempts: attempt, reconnectInterval: delay });
    console.log(
      `[WebSocket Store] Reconnecting in ${delay}ms... (${attempt}/${state.maxReconnectAttempts})`
    );

    reconnectTimer = setTimeout(() => {
      // A reconnect re-mints the admission ticket: the previous one expired.
      get().connect(url, protocolsRef);
    }, delay);
  };

  return {
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    socket: null,
    currentUrl: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    reconnectUrl: null,
    subscribers: new Set(),

    connect: (url: string, protocols?: WsProtocols) => {
      const state = get();
      protocolsRef = protocols;

      // A provider is resolved before the socket opens: the ticket is minted
      // per attempt over the authenticated surface.
      if (typeof protocols === 'function') {
        const seq = ++connectSeq;
        void (async () => {
          const list = await Promise.resolve().then(() => protocols()).catch(() => [WS_APP_PROTOCOL]);
          if (seq !== connectSeq) return; // a newer connection superseded this one
          get().connect(url, list);
          protocolsRef = protocols; // the next reconnect re-mints the ticket
        })();
        return;
      }

      connectSeq++;

      // If there's an existing socket with a different URL, close it first
      if (state.socket && state.currentUrl !== url) {
        // Null out handlers to prevent callbacks from stale socket
        state.socket.onopen = null;
        state.socket.onclose = null;
        state.socket.onerror = null;
        state.socket.onmessage = null;
        state.socket.close();
        // Immediately clear state so the guard below sees no stale socket
        set({ socket: null, currentUrl: null });
      }

      // Prevent multiple concurrent connections (including CLOSING state)
      if (
        state.isConnecting ||
        (state.socket?.readyState !== undefined &&
          state.socket.readyState !== WebSocket.CLOSED &&
          state.socket.readyState !== WebSocket.CLOSING)
      ) {
        // If already connected to the same URL, skip
        if (state.currentUrl === url && state.isConnected) {
          return;
        }
        // If connecting to same URL, also skip
        if (state.currentUrl === url && state.isConnecting) {
          return;
        }
        // For different URL case, we closed above, so proceed
      }

      set({ isConnecting: true, error: null, reconnectUrl: url });

      // Add beforeunload handler for clean disconnect
      // Remove any existing listener first to prevent duplicates
      window.removeEventListener('beforeunload', get().disconnect);
      window.addEventListener('beforeunload', get().disconnect);

      try {
        console.log('[WebSocket Store] Connecting to:', url);
        const ws = new WebSocket(url, protocols ?? []);

        ws.onopen = () => {
          console.log('[WebSocket Store] Connected');
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          set({
            isConnected: true,
            isConnecting: false,
            socket: ws,
            currentUrl: url,
            reconnectAttempts: 0,
            error: null,
          });
        };

        ws.onmessage = (event) => {
          if (!event.data || event.data === '') return;

          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('[WebSocket Store] Message received:', message.type);

            // Update last message
            set({ lastMessage: message });

            // Notify all subscribers
            get().subscribers.forEach((handler) => handler(message));
          } catch {
            console.log('[WebSocket Store] Non-JSON message received (probably ping)');
          }
        };

        ws.onclose = (event) => {
          console.log('[WebSocket Store] Disconnected:', event.code, event.reason);
          set({
            isConnected: false,
            isConnecting: false,
            socket: null,
            currentUrl: null,
          });

          // Clean up beforeunload listener
          window.removeEventListener('beforeunload', get().disconnect);

          // Only attempt reconnect if it wasn't a clean close (1000)
          if (event.code !== 1000 && get().reconnectUrl) {
            handleReconnect(get().reconnectUrl!);
          }
        };

        ws.onerror = (event) => {
          console.error('[WebSocket Store] Error:', event);
          set({ error: new Error('WebSocket error') });
        };
      } catch (error) {
        console.error('[WebSocket Store] Failed to create connection:', error);
        set({
          isConnecting: false,
          error: error instanceof Error ? error : new Error('Failed to connect'),
        });
        if (get().reconnectUrl) {
          handleReconnect(get().reconnectUrl!);
        }
      }
    },

    disconnect: () => {
      const { socket } = get();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (socket) {
        // Null out handlers to prevent callbacks
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        // Prevent auto-reconnect
        set({ reconnectAttempts: get().maxReconnectAttempts, reconnectUrl: null });
        socket.close(1000, 'Manual disconnect');
        set({ socket: null, currentUrl: null });
      }

      // Remove beforeunload handler if added
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', get().disconnect);
      }
    },

    sendMessage: (message: unknown) => {
      const { socket, isConnected } = get();
      if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        console.warn('[WebSocket Store] Cannot send message, not connected');
      }
    },

    subscribe: (handler: MessageHandler) => {
      const { subscribers } = get();
      subscribers.add(handler);
      
      // Return unsubscribe function
      return () => {
        get().subscribers.delete(handler);
      };
    },
  };
});