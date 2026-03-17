import { motion } from 'framer-motion';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { QuizQuestion } from '../types/questions.types';

interface QuestionItemProps {
  question: QuizQuestion;
  isDragging?: boolean;
  onEdit: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
  isDeleting?: boolean;
}

export function QuestionItem({
  question,
  isDragging = false,
  onEdit,
  onDelete,
  dragHandleProps,
  isDeleting = false,
}: QuestionItemProps) {
  const typeLabel = question.options ? 'Opción múltiple' : 'Texto';
  const typeColors: Record<string, string> = {
    'Texto': 'bg-blue-100 text-blue-700',
    'Opción múltiple': 'bg-purple-100 text-purple-700',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        relative bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100
        shadow-sm hover:shadow-md transition-shadow p-3
        ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''}
        ${isDeleting ? 'opacity-50' : ''}
      `}
      data-question-id={question.id}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          data-handle="drag-handle"
          aria-label="Drag to reorder"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          {...dragHandleProps}
        >
          <GripVertical size={18} />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500">#{question.sort_order}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[typeLabel]}`}>
              {typeLabel}
            </span>
            {question.is_scorable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                ✓
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-800 truncate">
            {question.question_text}
          </p>
          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
            {question.key}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(question)}
            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-pink-50 transition-colors"
            title="Editar"
            aria-label="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(question.id)}
            disabled={isDeleting}
            className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Eliminar"
            aria-label="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
