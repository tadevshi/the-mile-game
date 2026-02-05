import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface UseWebSocketOptions {
  onMessage?: MessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Use refs for callbacks to avoid re-creating connection when they change
  const callbacksRef = useRef({ onMessage, onConnect, onDisconnect, onError });
  callbacksRef.current = { onMessage, onConnect, onDisconnect, onError };

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;

    try {
      console.log('[WebSocket] Connecting to:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
        isConnectingRef.current = false;
        callbacksRef.current.onConnect?.();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        // Skip ping/pong messages (they have no data or are empty)
        if (!event.data || event.data === '') {
          return;
        }

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);
          setLastMessage(message);
          callbacksRef.current.onMessage?.(message);
        } catch (error) {
          // Not a JSON message, probably a ping - ignore
          console.log('[WebSocket] Non-JSON message received (probably ping)');
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        wsRef.current = null;
        isConnectingRef.current = false;
        
        if (!isMountedRef.current) return;
        
        setIsConnected(false);
        callbacksRef.current.onDisconnect?.();

        // Attempt reconnection if not manually closed
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(
            `[WebSocket] Reconnecting in ${reconnectInterval}ms... (${reconnectCountRef.current}/${reconnectAttempts})`
          );
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        } else {
          console.log('[WebSocket] Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        if (isMountedRef.current) {
          callbacksRef.current.onError?.(error);
        }
        // Don't close here - let onclose handle reconnection
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      isConnectingRef.current = false;
    }
  }, [url, reconnectInterval, reconnectAttempts]); // Removed callback dependencies - they are now in refs

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectCountRef.current = reconnectAttempts; // Prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}

export type { WebSocketMessage };
