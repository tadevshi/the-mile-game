import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { QuestionFormData, QuestionType } from '../types/questions.types';
import { TYPE_LABELS } from '../types/questions.types';

interface QuestionPreviewProps {
  data: QuestionFormData;
}

export function QuestionPreview({ data }: QuestionPreviewProps) {
  const typeColors: Record<QuestionType, string> = {
    text: 'from-blue-50 to-blue-100',
    choice: 'from-purple-50 to-purple-100',
    boolean: 'from-green-50 to-green-100',
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye size={16} className="text-gray-400" />
        <h3 className="font-display text-gray-700 text-sm">Preview</h3>
      </div>

      <motion.div
        key={`${data.type}-${data.section}`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          rounded-xl p-4 bg-gradient-to-br ${typeColors[data.type]}
          border border-white/50
        `}
      >
        {/* Question */}
        <p className="font-medium text-gray-800 mb-3">
          {data.question || 'Escribe tu pregunta...'}
        </p>

        {/* Input type preview */}
        {data.type === 'text' && (
          <div className="bg-white/60 rounded-lg px-3 py-2 border border-gray-200/50">
            <span className="text-gray-400 text-sm">Tu respuesta aquí</span>
          </div>
        )}

        {data.type === 'choice' && (
          <div className="space-y-2">
            {data.options.map((option, index) => (
              <div
                key={index}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg
                  bg-white/60 border border-gray-200/50
                  ${data.correct_answers.includes(option) ? 'ring-2 ring-green-400' : ''}
                `}
              >
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                <span className="text-sm text-gray-700">{option || `Opción ${index + 1}`}</span>
                {data.correct_answers.includes(option) && (
                  <span className="ml-auto text-green-600 text-xs">✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {data.type === 'boolean' && (
          <div className="flex gap-3">
            <div
              className={`
                flex-1 text-center px-3 py-2 rounded-lg
                bg-white/60 border border-gray-200/50
                ${data.correct_answers.includes('true') ? 'ring-2 ring-green-400' : ''}
              `}
            >
              <span className="text-sm text-gray-700">Verdadero</span>
            </div>
            <div
              className={`
                flex-1 text-center px-3 py-2 rounded-lg
                bg-white/60 border border-gray-200/50
                ${data.correct_answers.includes('false') ? 'ring-2 ring-green-400' : ''}
              `}
            >
              <span className="text-sm text-gray-700">Falso</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Metadata */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <span className="px-2 py-0.5 bg-gray-100 rounded">{TYPE_LABELS[data.type]}</span>
        <span>•</span>
        <span>{data.section}</span>
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
