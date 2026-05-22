import { create } from 'zustand';

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
  connect: (url: string) => void;
  disconnect: () => void;
  sendMessage: (message: unknown) => void;
  subscribe: (handler: MessageHandler) => () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
      get().connect(url);
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

    connect: (url: string) => {
      const state = get();

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
        const ws = new WebSocket(url);

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