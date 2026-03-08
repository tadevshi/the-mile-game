import { create } from 'zustand';

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
}

export const useEventStore = create<EventState>((set) => ({
  currentEvent: null,
  isLoading: false,
  error: null,
  
  setEvent: (event) => set({ currentEvent: event, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearEvent: () => set({ currentEvent: null, isLoading: false, error: null }),
}));

// Helper hook to check if a feature is enabled
export function useFeatureEnabled(feature: keyof EventFeatures): boolean {
  const currentEvent = useEventStore((state) => state.currentEvent);
  return currentEvent?.features?.[feature] ?? false;
}
