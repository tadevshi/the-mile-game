import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Settings, Eye, Copy, MoreVertical, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Event } from '@/shared/lib/api';

interface EventCardProps {
  event: Event;
  onDelete?: (slug: string) => void;
}

// Theme color mappings for event cards
const themeGradients: Record<string, { from: string; to: string }> = {
  princess: { from: 'from-pink-400', to: 'to-rose-500' },
  elegant: { from: 'from-slate-400', to: 'to-slate-600' },
  party: { from: 'from-purple-500', to: 'to-pink-500' },
  corporate: { from: 'from-blue-500', to: 'to-indigo-600' },
  kids: { from: 'from-yellow-400', to: 'to-orange-500' },
  dark: { from: 'from-slate-700', to: 'to-slate-900' },
  default: { from: 'from-pink-400', to: 'to-rose-500' },
};

export function EventCard({ event, onDelete }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const themeId = event.theme_id || 'default';
  const gradient = themeGradients[themeId] || themeGradients.default;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/e/${event.slug}`;
    navigator.clipboard.writeText(url);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (onDelete && confirm('¿Estás seguro de eliminar este evento?')) {
      onDelete(event.slug);
    }
    setShowMenu(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)' }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden transition-shadow border border-gray-100 dark:border-slate-700"
    >
      {/* Card Header with Gradient */}
      <div className={`h-2 bg-gradient-to-r ${gradient.from} ${gradient.to}`} />
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
              {event.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              themile.game/{event.slug}
            </p>
          </div>
          
          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Menú de opciones"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 min-w-[160px]"
                  >
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar link
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(event.date)}</span>
        </div>

        {/* Features Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.features?.quiz && (
            <span className="px-2.5 py-1 text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full flex items-center gap-1" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
              <span>🧠</span> Quiz
            </span>
          )}
          {event.features?.corkboard && (
            <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full flex items-center gap-1" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-amber, #F59E0B) 15%, transparent)' }}>
              <span>📌</span> Corcho
            </span>
          )}
          {event.features?.secretBox && (
            <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center gap-1" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-purple, #A855F7) 15%, transparent)' }}>
              <span>🎁</span> Caja Secreta
            </span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              event.is_active
                ? 'bg-green-500'
                : 'bg-gray-400'
            }`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {event.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-3 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-2">
        {/* View Button */}
        <Link
          to={`/e/${event.slug}`}
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[var(--color-accent)] dark:hover:text-[var(--color-primary)] hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Admin Button */}
        <Link
          to={`/admin/${event.slug}?tab=config`}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-accent)] rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Admin
        </Link>
      </div>
    </motion.div>
  );
}
