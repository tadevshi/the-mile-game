import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogOut, Calendar, Settings, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { api, type Event } from '@/shared/lib/api';
import { Button } from '@/shared/components/Button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EventCard } from '../components/EventCard';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userEvents = await api.getUserEvents();
        setEvents(userEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Error al cargar tus eventos. Intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCreateEvent = () => {
    navigate('/events/new');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.name || 'Usuario'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-gray-500 hover:text-red-500"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-gray-800 mb-2">Mis Eventos</h1>
          <p className="text-gray-500">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'} creados
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
          >
            {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline font-medium"
            >
              Reintentar
            </button>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && events.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-32 h-32 mx-auto mb-6 bg-pink-100 rounded-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-pink-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No tienes eventos aún
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Crea tu primer evento y comienza a organizar experiencias únicas para tus invitados.
            </p>
            <Button
              onClick={handleCreateEvent}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg shadow-pink-200 hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              Crear mi primer evento
            </Button>
          </motion.div>
        )}

        {/* Events Grid */}
        {!isLoading && !error && events.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* FAB - Floating Action Button */}
      {!isLoading && events.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateEvent}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg shadow-pink-300 flex items-center justify-center hover:shadow-xl transition-shadow z-10"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      )}

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 md:hidden z-10">
        <div className="flex items-center justify-around py-3">
          <button className="flex flex-col items-center gap-1 text-pink-500">
            <Calendar className="w-6 h-6" />
            <span className="text-xs font-medium">Eventos</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400">
            <Settings className="w-6 h-6" />
            <span className="text-xs">Configuración</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400">
            <HelpCircle className="w-6 h-6" />
            <span className="text-xs">Ayuda</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
