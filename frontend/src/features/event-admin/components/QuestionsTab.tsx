import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, AlertTriangle, ArrowRight, Info, Star, Brain, Edit3 } from 'lucide-react';
import { useEventAdmin } from '../hooks/useEventAdmin';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import type { PreviewTheme } from '@/themes';

interface QuestionsTabProps {
  slug: string;
  previewTheme?: PreviewTheme;
}

export function QuestionsTab({ slug, previewTheme }: QuestionsTabProps) {
  const { event, questions, isLoadingQuestions } = useEventAdmin(slug);

  // Use preview theme colors or fallbacks
  const theme: PreviewTheme = previewTheme || {
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accentColor: '#DB2777',
    bgColor: '#FFF5F7',
    textColor: '#1E293B',
    displayFont: 'Great Vibes',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    backgroundStyle: 'watercolor',
  };

  const favoriteCount = questions.filter((q) => q.section === 'favorites').length;
  const prefCount = questions.filter((q) => q.section === 'preferences').length;
  const descCount = questions.filter((q) => q.section === 'description').length;

  const quizEnabled = event?.features?.quiz ?? false;
  const hasQuestions = questions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-display mb-1" style={{ color: theme.textColor }}>
            Preguntas del Quiz
          </h2>
          <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
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
            <span className="text-xs flex items-center gap-1" style={{ color: `${theme.textColor}50` }}>
              <Info className="w-3 h-3" />
              Quiz deshabilitado
            </span>
        )}
      </div>

      {quizEnabled && !hasQuestions && !isLoadingQuestions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ 
            backgroundColor: `${theme.primaryColor}15`,
            border: `1px solid ${theme.primaryColor}30`
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: theme.primaryColor }} />
          <div>
            <p className="text-sm font-medium" style={{ color: theme.textColor }}>
              Habilitaste Quiz pero no hay preguntas
            </p>
            <p className="text-xs mt-0.5" style={{ color: `${theme.textColor}80` }}>
              Agregá preguntas al quiz para que funcione correctamente.
            </p>
          </div>
        </motion.div>
      )}

      {isLoadingQuestions ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
              <Skeleton height="16px" width="60%" className="mb-2" />
              <Skeleton height="12px" width="40%" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8" style={{ color: `${theme.textColor}50` }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay preguntas configuradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteCount > 0 && (
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
              <div>
                <p className="font-medium flex items-center gap-2" style={{ color: theme.textColor }}>
                  <Star className="w-4 h-4" style={{ color: theme.primaryColor }} />
                  Favoritos
                </p>
                <p className="text-sm" style={{ color: `${theme.textColor}80` }}>{favoriteCount} preguntas</p>
              </div>
            </div>
          )}
          {prefCount > 0 && (
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
              <div>
                <p className="font-medium flex items-center gap-2" style={{ color: theme.textColor }}>
                  <Brain className="w-4 h-4" style={{ color: theme.accentColor }} />
                  Preferencias
                </p>
                <p className="text-sm" style={{ color: `${theme.textColor}80` }}>{prefCount} preguntas</p>
              </div>
            </div>
          )}
          {descCount > 0 && (
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: `${theme.secondaryColor}30` }}>
              <div>
                <p className="font-medium flex items-center gap-2" style={{ color: theme.textColor }}>
                  <Edit3 className="w-4 h-4" style={{ color: theme.primaryColor }} />
                  Descripción
                </p>
                <p className="text-sm" style={{ color: `${theme.textColor}80` }}>{descCount} preguntas</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Link to={`/admin/${slug}/questions`} className="block">
        <Button 
          variant="primary" 
          fullWidth 
          style={{ 
            backgroundColor: theme.primaryColor,
            boxShadow: `0 4px 14px ${theme.primaryColor}30`
          }}
        >
          Gestionar Preguntas
        </Button>
      </Link>
    </div>
  );
}
