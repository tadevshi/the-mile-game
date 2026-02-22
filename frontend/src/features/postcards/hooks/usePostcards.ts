import { useCallback, useEffect, useRef } from 'react';
import { usePostcardStore } from '../store/postcardStore';
import { postcardService } from '../services/postcardApi';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
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
    setPostcards,
    addPostcard,
    setLoading,
    setError,
  } = usePostcardStore();

  const hasFetchedRef = useRef(false);

  // WebSocket para recibir postales nuevas en tiempo real
  useWebSocket(getWsUrl(), {
    onMessage: useCallback(
      (message: { type: string; data?: unknown; postcard?: unknown }) => {
        if (message.type === 'postcard_new' && message.postcard) {
          addPostcard(message.postcard as Postcard);
        }
      },
      [addPostcard]
    ),
  });

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
    async (imageFile: File, message: string) => {
      setLoading(true);
      setError(null);

      try {
        // Redimensionar antes de subir
        const resized = await postcardService.resizeImage(imageFile);
        const newPostcard = await postcardService.create(resized, message);

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
    fetchPostcards,
    createPostcard,
  };
}
