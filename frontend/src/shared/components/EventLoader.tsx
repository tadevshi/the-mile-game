import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore, type Event } from '@/shared/store/eventStore';
import { api } from '@/shared/lib/api';
import { Button } from '@/shared/components/Button';

interface EventLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function EventLoader({ children, fallback }: EventLoaderProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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
        const rawFeatures = event.features as Record<string, boolean>;
        const transformedEvent: Event = {
          id: event.id,
          slug: event.slug,
          name: event.name,
          description: event.description,
          date: event.date,
          ownerId: event.owner_id,
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
            <p className="font-serif text-slate-500">Cargando evento...</p>
          </div>
        </div>
      )
    );
  }

  if (notFound || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-display text-accent mb-4">
            {notFound ? '404' : '😕'}
          </h1>
          <p className="font-serif text-slate-600 mb-6">
            {error || 'Evento no encontrado'}
          </p>
          <Button onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return null;
  }

  return <>{children}</>;
}
