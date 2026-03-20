import { create } from 'zustand';
import type { Event } from '@/shared/lib/api';
import { api } from '@/shared/lib/api';

interface DashboardState {
  // Data
  events: Event[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchEvents: () => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const events = await api.getUserEvents();
      set({ events, isLoading: false });
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ 
        error: 'Error al cargar tus eventos. Intenta de nuevo.', 
        isLoading: false 
      });
    }
  },

  deleteEvent: async (id: string) => {
    try {
      // Call delete endpoint
      await api.delete(`/events/${id}`);
      // Update local state
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting event:', error);
      set({ error: 'Error al eliminar el evento. Intenta de nuevo.' });
    }
  },

  clearError: () => set({ error: null }),
}));
