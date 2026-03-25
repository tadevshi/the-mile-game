import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { QuizQuestion, QuestionSection } from '../types/questions.types';
import { SECTION_LABELS } from '../types/questions.types';
import { groupQuestionsBySection } from '../hooks/useQuestionEditor';

interface QuestionListProps {
  questions: QuizQuestion[];
  onReorder: (orders: { id: string; sort_order: number }[]) => void;
  onEdit: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
  deletingId?: string | null;
}

// Sortable wrapper component
function SortableQuestionItem({
  question,
  onEdit,
  onDelete,
  isDeleting,
}: {
  question: QuizQuestion;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

    // Derive type from options presence
    const questionType = question.options && question.options.length > 0 ? 'choice' : 'text';
    const typeLabels: Record<string, string> = {
      text: 'Texto',
      choice: 'Opción múltiple',
    };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        relative bg-white/80 backdrop-blur-sm rounded-xl border border-[var(--color-secondary)]
        shadow-sm hover:shadow-md transition-shadow p-3
        ${isDragging ? 'ring-2 ring-[var(--color-primary)] shadow-lg z-50' : ''}
        ${isDeleting ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500">#{question.sort_order}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${questionType === 'choice' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {typeLabels[questionType]}
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
            className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(question.id)}
            disabled={isDeleting}
            className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Section group component
function QuestionSectionGroup({
  section,
  questions,
  onEdit,
  onDelete,
  deletingId,
}: {
  section: QuestionSection;
  questions: QuizQuestion[];
  onEdit: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
          {SECTION_LABELS[section]}
        </h3>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{questions.length}</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {questions.map((question) => (
            <SortableQuestionItem
              key={question.id}
              question={question}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingId === question.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function QuestionList({
  questions,
  onReorder,
  onEdit,
  onDelete,
  deletingId = null,
}: QuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const groupedQuestions = groupQuestionsBySection(questions);
  const allQuestionIds = questions.map((q) => q.id);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = questions.findIndex((q) => q.id === active.id);
        const newIndex = questions.findIndex((q) => q.id === over.id);

        const reordered = arrayMove(questions, oldIndex, newIndex);

        // Calculate new sort orders
        const orders = reordered.map((q, index) => ({
          id: q.id,
          sort_order: index,
        }));

        onReorder(orders);
      }
    },
    [questions, onReorder]
  );

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-gray-500 font-medium">No hay preguntas todavía</p>
        <p className="text-gray-400 text-sm mt-1">
          Crea tu primera pregunta usando el formulario de la derecha
        </p>
      </div>
    );
  }

  // Flatten all questions for the SortableContext, but render in groups
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allQuestionIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          <QuestionSectionGroup
            section="favorites"
            questions={groupedQuestions.favorites}
            onEdit={onEdit}
            onDelete={onDelete}
            deletingId={deletingId}
          />
          <QuestionSectionGroup
            section="preferences"
            questions={groupedQuestions.preferences}
            onEdit={onEdit}
            onDelete={onDelete}
            deletingId={deletingId}
          />
          <QuestionSectionGroup
            section="description"
            questions={groupedQuestions.description}
            onEdit={onEdit}
            onDelete={onDelete}
            deletingId={deletingId}
          />
        </div>
      </SortableContext>
    </DndContext>
  );
}
