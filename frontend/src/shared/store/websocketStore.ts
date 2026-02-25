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
  
  // Reconnection state
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  
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

    set({ reconnectAttempts: state.reconnectAttempts + 1 });
    console.log(
      `[WebSocket Store] Reconnecting in ${state.reconnectInterval}ms... (${state.reconnectAttempts + 1}/${state.maxReconnectAttempts})`
    );

    reconnectTimer = setTimeout(() => {
      get().connect(url);
    }, state.reconnectInterval);
  };

  return {
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    subscribers: new Set(),

    connect: (url: string) => {
      const state = get();
      
      // Prevent multiple connections
      if (state.isConnecting || state.socket?.readyState === WebSocket.OPEN) {
        return;
      }

      set({ isConnecting: true, error: null });

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
          });

          // Only attempt reconnect if it wasn't a clean close (1000)
          if (event.code !== 1000) {
            handleReconnect(url);
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
        handleReconnect(url);
      }
    },

    disconnect: () => {
      const { socket } = get();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      if (socket) {
        // Prevent auto-reconnect
        set({ reconnectAttempts: get().maxReconnectAttempts });
        socket.close(1000, 'Manual disconnect');
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