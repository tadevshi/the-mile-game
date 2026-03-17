import { create } from 'zustand';
import { api } from '../lib/api';

export interface Event {
  id: string;
  slug: string;
  name: string;
  description?: string;
  date?: string;
  ownerId?: string;
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
      
      // API call
      const updatedEvent = await api.updateEventFeatures(
        currentEvent.slug, 
        features
      );
      
      // Confirmar con datos del servidor
      set({ currentEvent: updatedEvent });
      
      return updatedEvent;
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
