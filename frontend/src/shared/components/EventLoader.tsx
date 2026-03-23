import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { useEventStore, type Event } from '@/shared/store/eventStore';
import { api } from '@/shared/lib/api';
import { Button } from '@/shared/components/Button';
import { EventLandingSkeleton } from './EventSkeletons';

interface EventLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Usar skeleton de landing page en lugar del spinner genérico */
  useLandingSkeleton?: boolean;
}

export function EventLoader({ children, fallback, useLandingSkeleton }: EventLoaderProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useEventNavigate();
  const { currentEvent, setEvent, setLoading, setError, isLoading, error } = useEventStore();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    // Don't refetch if we already have this event
    if (currentEvent?.slug === slug) {
      return;
    }

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const event = await api.getEventBySlug(slug);
        
        // Transform backend response to match our Event type.
        // Backend sends snake_case (secret_box), frontend uses camelCase (secretBox).
        const rawFeatures = event.features as unknown as Record<string, boolean>;
        const transformedEvent: Event = {
          id: event.id,
          slug: event.slug,
          name: event.name,
          description: event.description,
          date: event.date,
          ownerId: event.owner_id,
          themeId: event.theme_id,
          features: {
            quiz: rawFeatures.quiz ?? false,
            corkboard: rawFeatures.corkboard ?? false,
            secretBox: rawFeatures.secret_box ?? rawFeatures.secretBox ?? false,
          },
          isActive: event.is_active,
        };
        
        setEvent(transformedEvent);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setNotFound(true);
          setError('Evento no encontrado');
        } else if (err.response?.status === 410) {
          setError('Este evento ha terminado');
        } else {
          setError('Error al cargar el evento');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

    // Cleanup: clear event when leaving event routes
    return () => {
      // Don't clear on unmount if navigating to another event route
    };
  }, [slug]);

  if (isLoading) {
    return (
      fallback || (
        useLandingSkeleton ? (
          <EventLandingSkeleton />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
              <p className="font-serif text-slate-500">Cargando evento...</p>
            </div>
          </div>
        )
      )
    );
  }

  if (notFound || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
        <div className="text-center px-6 max-w-md">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <div className="text-7xl">
              {notFound ? '🔍' : '😕'}
            </div>
          </motion.div>
          
          {/* Title */}
          <h1 className="text-3xl font-display text-gray-800 dark:text-white mb-3">
            {notFound ? 'Evento no encontrado' : 'Ups, algo salió mal'}
          </h1>
          
          {/* Description */}
          <p className="font-serif text-gray-600 dark:text-gray-400 mb-2">
            {notFound 
              ? 'El código de evento que ingresaste no existe o puede haber sido eliminado.'
              : error || 'No pudimos cargar la información del evento.'
            }
          </p>
          
          {/* Help text */}
          <p className="text-sm text-gray-400 mb-6">
            Verificá el código e intentá de nuevo, o volvé al inicio.
          </p>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate('/')}
              className="px-6 py-3"
            >
              ← Volver al inicio
            </Button>
            {notFound && (
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="px-6 py-3"
              >
                Intentá de nuevo
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return null;
  }

  return <>{children}</>;
}
