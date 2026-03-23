import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { EventCard, EmptyState, DashboardSkeleton } from '../components';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { events, isLoading, error, fetchEvents, deleteEvent, clearError } = useDashboardStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCreateEvent = () => {
    navigate('/wizard/new');
  };

  const handleRefresh = () => {
    clearError();
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-pink-100 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-800 dark:text-white truncate">{user?.name || 'Usuario'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Actualizar"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display text-gray-800 dark:text-white mb-2">
            Mis Eventos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'} creados
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300 flex-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
              >
                Reintentar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && events.length === 0 && (
          <DashboardSkeleton />
        )}

        {/* Empty State */}
        {!isLoading && !error && events.length === 0 && (
          <EmptyState onCreateEvent={handleCreateEvent} />
        )}

        {/* Events Grid */}
        {!isLoading && events.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {events.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  onDelete={deleteEvent}
                />
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg shadow-pink-300 dark:shadow-pink-900/50 flex items-center justify-center hover:shadow-xl transition-shadow z-10"
          aria-label="Crear nuevo evento"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      )}
    </div>
  );
}
