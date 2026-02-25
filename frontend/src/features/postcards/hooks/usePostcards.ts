import { useCallback, useEffect, useRef } from 'react';
import { usePostcardStore } from '../store/postcardStore';
import { postcardService } from '../services/postcardApi';
import { useWebSocketStore } from '@/shared/store/websocketStore';
import type { Postcard } from '../types/postcards.types';

// Construir la URL del WebSocket según entorno
function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function usePostcards() {
  const {
    postcards,
    isLoading,
    error,
    isRevealing,
    revealedPostcards,
    setPostcards,
    addPostcard,
    setLoading,
    setError,
    setRevealing,
    addRevealedPostcards,
  } = usePostcardStore();

  const hasFetchedRef = useRef(false);

  // Initialize WebSocket connection and subscriptions
  useEffect(() => {
    const wsStore = useWebSocketStore.getState();
    const url = getWsUrl();
    
    // Connect if not already connected
    if (!wsStore.isConnected && !wsStore.isConnecting) {
      wsStore.connect(url);
    }

    // Subscribe to messages
    const unsubscribe = wsStore.subscribe((message) => {
      if (message.type === 'postcard_new' && message.postcard) {
        addPostcard(message.postcard as Postcard);
      }
      if (message.type === 'secret_box_reveal' && Array.isArray(message.postcards)) {
        // Trigger gift box animation: set isRevealing=true, then after animation
        // addRevealedPostcards merges them into the board
        setRevealing(true);
        // Store the incoming postcards temporarily in revealedPostcards
        // The GiftBox component will call addRevealedPostcards when animation finishes
        usePostcardStore.setState({ revealedPostcards: message.postcards as Postcard[] });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addPostcard, setRevealing]);

  // Fetch inicial de postales
  const fetchPostcards = useCallback(async () => {
    if (isLoading) return;
    setLoading(true);
    setError(null);

    try {
      const data = await postcardService.fetchAll();
      setPostcards(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar postales';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isLoading, setPostcards, setLoading, setError]);

  // Fetch automático al montar (una sola vez)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchPostcards();
    }
  }, [fetchPostcards]);

  // Crear una postal nueva
  const createPostcard = useCallback(
    async (imageFile: File, message: string, senderName?: string) => {
      setLoading(true);
      setError(null);

      try {
        // Redimensionar antes de subir
        const resized = await postcardService.resizeImage(imageFile);
        const newPostcard = await postcardService.create(resized, message, senderName);

        // Agregar localmente (el WebSocket también la enviará,
        // pero addPostcard deduplica por ID)
        addPostcard(newPostcard);

        return newPostcard;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al crear postal';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addPostcard, setLoading, setError]
  );

  return {
    postcards,
    isLoading,
    error,
    isRevealing,
    revealedPostcards,
    fetchPostcards,
    createPostcard,
    addRevealedPostcards,
  };
}
