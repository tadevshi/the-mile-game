import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { PreviewTheme } from '@/themes';
import type { QuestionFormData } from '../types/questions.types';
import { SECTION_LABELS } from '../types/questions.types';

interface QuestionPreviewProps {
  data: QuestionFormData;
  theme: PreviewTheme;
}

export function QuestionPreview({ data, theme }: QuestionPreviewProps) {
  const isDarkTheme = theme.backgroundStyle === 'dark';
  const isChoice = data.options.length > 0;
  
  const bgGradient = isChoice 
    ? 'from-purple-50 to-purple-100' 
    : 'from-blue-50 to-blue-100';

  return (
    <div className="backdrop-blur-sm rounded-2xl border border-[var(--color-secondary)] p-4" style={{ backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.8)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Eye size={16} style={{ color: 'color-mix(in srgb, var(--color-text) 65%, transparent)' }} />
        <h3 className="font-display text-sm" style={{ color: theme.textColor }}>Preview</h3>
      </div>

      <motion.div
        key={`${data.section}-${isChoice}`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          rounded-xl p-4 bg-gradient-to-br ${bgGradient}
          border border-white/50
        `}
      >
        {/* Question */}
        <p className="font-medium mb-3" style={{ color: theme.textColor }}>
          {data.question_text || 'Escribe tu pregunta...'}
        </p>

        {/* Input type preview */}
        {!isChoice && (
          <div className="rounded-lg px-3 py-2 border" style={{ backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.54)' : 'rgba(255,255,255,0.6)', borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.18)' : 'rgba(229,231,235,0.5)' }}>
            <span className="text-sm" style={{ color: 'color-mix(in srgb, var(--color-text) 60%, transparent)' }}>Tu respuesta aquí</span>
          </div>
        )}

        {isChoice && (
          <div className="space-y-2">
            {data.options.map((option, index) => (
              <div
                key={index}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg
                   border
                   ${data.correct_answers.includes(option) ? 'ring-2 ring-green-400' : ''}
                 `}
                 style={{ backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.54)' : 'rgba(255,255,255,0.6)', borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.18)' : 'rgba(229,231,235,0.5)' }}
               >
                 <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.5)' : 'rgba(209,213,219,1)' }} />
                 <span className="text-sm" style={{ color: theme.textColor }}>{option || `Opción ${index + 1}`}</span>
                 {data.correct_answers.includes(option) && (
                   <span className="ml-auto text-green-600 text-xs">✓</span>
                 )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Metadata */}
      <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'color-mix(in srgb, var(--color-text) 65%, transparent)' }}>
        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: isDarkTheme ? 'rgba(30, 41, 59, 0.9)' : 'rgba(243,244,246,1)' }}>
          {isChoice ? 'Opción múltiple' : 'Texto'}
        </span>
        <span>•</span>
        <span>{SECTION_LABELS[data.section]}</span>
        {data.is_scorable && (
          <>
            <span>•</span>
            <span className="text-amber-600">Puntuable</span>
          </>
        )}
      </div>
    </div>
  );
}
