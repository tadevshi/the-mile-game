import { create } from 'zustand';
import { api } from '../lib/api';

export interface Event {
  id: string;
  slug: string;
  name: string;
  description?: string;
  date?: string;
  ownerId?: string;
  themeId?: string;
  features: EventFeatures;
  isActive: boolean;
}

export interface EventFeatures {
  quiz: boolean;
  corkboard: boolean;
  secretBox: boolean;
}

interface EventState {
  // Current event being viewed/played
  currentEvent: Event | null;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setEvent: (event: Event | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearEvent: () => void;
  updateFeatures: (features: EventFeatures) => Promise<Event>;
}

export const useEventStore = create<EventState>((set, get) => ({
  currentEvent: null,
  isLoading: false,
  error: null,
  
  setEvent: (event) => set({ currentEvent: event, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearEvent: () => set({ currentEvent: null, isLoading: false, error: null }),
  
  updateFeatures: async (features: EventFeatures) => {
    const { currentEvent } = get();
    if (!currentEvent) {
      throw new Error('No event loaded');
    }

    // Guardar el estado actual para posible revert
    const previousEvent = currentEvent;
    
    try {
      // Optimistic update
      set({
        currentEvent: {
          ...previousEvent,
          features
        }
      });
      
      // API call - JWT auth is handled automatically by interceptor
      const response = await api.updateEventFeatures(
        currentEvent.slug, 
        features
      );
      
      // Transform response from snake_case (API) to camelCase (store)
      // API returns: { owner_id, is_active, features: { secret_box } }
      // Store expects: { ownerId, isActive, features: { secretBox } }
      const apiFeatures = response.features as unknown as Record<string, boolean>;
      const transformedEvent: Event = {
        id: response.id,
        slug: response.slug,
        name: response.name,
        description: response.description,
        date: response.date,
        ownerId: response.owner_id,
        isActive: response.is_active,
        features: {
          quiz: response.features.quiz,
          corkboard: response.features.corkboard,
          secretBox: apiFeatures['secret_box'] ?? false,
        },
      };
      
      // Confirmar con datos del servidor
      set({ currentEvent: transformedEvent });
      
      return transformedEvent;
    } catch (error) {
      // Revertir en caso de error
      set({ currentEvent: previousEvent });
      throw error;
    }
  }
}));

// Helper hook to check if a feature is enabled
export function useFeatureEnabled(feature: keyof EventFeatures): boolean {
  const currentEvent = useEventStore((state) => state.currentEvent);
  return currentEvent?.features?.[feature] ?? false;
}
