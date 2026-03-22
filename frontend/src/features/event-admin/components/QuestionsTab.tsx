import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';

interface QuestionsTabProps {
  slug: string;
}

export function QuestionsTab({ slug }: QuestionsTabProps) {
  const { event, questions, isLoadingQuestions } = useEventAdmin(slug);

  const favoriteCount = questions.filter((q) => q.section === 'favorites').length;
  const prefCount = questions.filter((q) => q.section === 'preferences').length;
  const descCount = questions.filter((q) => q.section === 'description').length;

  const quizEnabled = event?.features?.quiz ?? false;
  const hasQuestions = questions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-display text-gray-800 mb-1">
            Preguntas del Quiz
          </h2>
          <p className="text-sm text-gray-500">
            {isLoadingQuestions
              ? 'Cargando...'
              : `${questions.length} pregunta${questions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {quizEnabled ? (
          hasQuestions && (
            <Link to={`/admin/${slug}/questions`}>
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Editar Preguntas
              </Button>
            </Link>
          )
        ) : (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Quiz deshabilitado
            </span>
        )}
      </div>

      {quizEnabled && !hasQuestions && !isLoadingQuestions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Habilitaste Quiz pero no hay preguntas
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Agregá preguntas al quiz para que funcione correctamente.
            </p>
          </div>
        </motion.div>
      )}

      {isLoadingQuestions ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/60 rounded-xl p-4">
              <Skeleton height="16px" width="60%" className="mb-2" />
              <Skeleton height="12px" width="40%" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay preguntas configuradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteCount > 0 && (
            <div className="bg-white/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">⭐ Favoritos</p>
                <p className="text-sm text-gray-500">{favoriteCount} preguntas</p>
              </div>
            </div>
          )}
          {prefCount > 0 && (
            <div className="bg-white/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">🤔 Preferencias</p>
                <p className="text-sm text-gray-500">{prefCount} preguntas</p>
              </div>
            </div>
          )}
          {descCount > 0 && (
            <div className="bg-white/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">✍️ Descripción</p>
                <p className="text-sm text-gray-500">{descCount} preguntas</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Link to={`/admin/${slug}/questions`} className="block">
        <Button variant="primary" fullWidth className="bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200">
          Gestionar Preguntas
        </Button>
      </Link>
    </div>
  );
}
