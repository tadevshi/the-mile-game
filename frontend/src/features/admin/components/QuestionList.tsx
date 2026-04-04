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
import type { PreviewTheme } from '@/themes';
import type { QuizQuestion, QuestionSection } from '../types/questions.types';
import { SECTION_LABELS } from '../types/questions.types';
import { groupQuestionsBySection } from '../hooks/useQuestionEditor';

interface QuestionListProps {
  questions: QuizQuestion[];
  onReorder: (orders: { id: string; sort_order: number }[]) => void;
  onEdit: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
  deletingId?: string | null;
  theme: PreviewTheme;
}

// Sortable wrapper component
function SortableQuestionItem({
  question,
  onEdit,
  onDelete,
  isDeleting,
  theme,
}: {
  question: QuizQuestion;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  theme: PreviewTheme;
}) {
  const isDarkTheme = theme.backgroundStyle === 'dark';
  const itemSurface = isDarkTheme ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.8)';
  const mutedText = isDarkTheme ? 'rgba(226, 232, 240, 0.72)' : 'rgba(107, 114, 128, 1)';

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
      style={{ ...style, backgroundColor: itemSurface }}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        relative backdrop-blur-sm rounded-xl border border-[var(--color-secondary)]
        shadow-sm hover:shadow-md transition-shadow p-3
        ${isDragging ? 'ring-2 ring-[var(--color-primary)] shadow-lg z-50' : ''}
        ${isDeleting ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          className="cursor-grab active:cursor-grabbing p-1"
          style={{ color: mutedText }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono" style={{ color: mutedText }}>#{question.sort_order}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${questionType === 'choice' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {typeLabels[questionType]}
            </span>
            {question.is_scorable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                ✓
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate" style={{ color: theme.textColor }}>
            {question.question_text}
          </p>
          <p className="text-xs font-mono mt-0.5 truncate" style={{ color: mutedText }}>
            {question.key}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(question)}
            className="p-2 rounded-lg hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] transition-colors"
            style={{ color: mutedText }}
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(question.id)}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            style={{ color: mutedText }}
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
  theme,
}: {
  section: QuestionSection;
  questions: QuizQuestion[];
  onEdit: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  theme: PreviewTheme;
}) {
  const isDarkTheme = theme.backgroundStyle === 'dark';
  const mutedText = isDarkTheme ? 'rgba(226, 232, 240, 0.72)' : 'rgba(75, 85, 99, 1)';
  const dividerColor = isDarkTheme ? 'rgba(148, 163, 184, 0.22)' : 'rgba(229, 231, 235, 1)';

  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: mutedText }}>
          {SECTION_LABELS[section]}
        </h3>
        <div className="flex-1 h-px" style={{ backgroundColor: dividerColor }} />
        <span className="text-xs" style={{ color: mutedText }}>{questions.length}</span>
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
              theme={theme}
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
  theme,
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
    const emptyMutedText = theme.backgroundStyle === 'dark'
      ? 'rgba(226, 232, 240, 0.72)'
      : 'color-mix(in srgb, var(--color-text) 70%, transparent)';

    return (
      <div className="text-center py-12 px-4">
        <div className="text-4xl mb-3">📝</div>
        <p className="font-medium" style={{ color: 'var(--color-text)' }}>No hay preguntas todavía</p>
        <p className="text-sm mt-1" style={{ color: emptyMutedText }}>
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
            theme={theme}
          />
          <QuestionSectionGroup
            section="preferences"
            questions={groupedQuestions.preferences}
            onEdit={onEdit}
            onDelete={onDelete}
            deletingId={deletingId}
            theme={theme}
          />
          <QuestionSectionGroup
            section="description"
            questions={groupedQuestions.description}
            onEdit={onEdit}
            onDelete={onDelete}
            deletingId={deletingId}
            theme={theme}
          />
        </div>
      </SortableContext>
    </DndContext>
  );
}
