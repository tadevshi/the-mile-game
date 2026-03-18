import { motion } from 'framer-motion';
import { Calendar, Settings, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Event } from '@/shared/lib/api';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
      className="bg-white rounded-2xl shadow-md border border-pink-100 overflow-hidden transition-shadow"
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 truncate">
              {event.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">themile.game/{event.slug}</p>
          </div>
          
          {/* Status Badge */}
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              event.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {event.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(event.date)}</span>
        </div>

        {/* Features Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.features?.quiz && (
            <span className="px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded-full">
              Quiz
            </span>
          )}
          {event.features?.corkboard && (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">
              Corcho
            </span>
          )}
          {event.features?.secretBox && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
              Caja Secreta
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="border-t border-pink-50 px-5 py-3 bg-pink-50/30 flex items-center justify-end gap-2">
        {/* View Button */}
        <Link
          to={`/event/${event.slug}`}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver
        </Link>

        {/* Admin Button */}
        <Link
          to={`/admin/event/${event.slug}/theme`}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Admin
        </Link>
      </div>
    </motion.div>
  );
}
