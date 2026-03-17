import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared';
import { useQuestionEditor } from '../hooks/useQuestionEditor';
import { QuestionList } from '../components/QuestionList';
import { QuestionForm } from '../components/QuestionForm';
import { QuestionPreview } from '../components/QuestionPreview';
import { ImportExportPanel } from '../components/ImportExportPanel';
import type { QuizQuestion, QuestionFormData, QuestionSection } from '../types/questions.types';

export function QuestionEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventSlug = searchParams.get('event') ?? '';
  const adminKey = searchParams.get('key') ?? '';

  const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestion | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuestionFormData | null>(null);

  const {
    questions,
    isLoading,
    error,
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
    importMutation,
    exportQuestions,
  } = useQuestionEditor(eventSlug, adminKey);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const deletingId = deleteMutation.isPending ? showDeleteConfirm : null;

  // Handle create/update
  const handleSubmit = async (data: QuestionFormData) => {
    try {
      if (selectedQuestion) {
        // Update
        await updateMutation.mutateAsync({
          id: selectedQuestion.id,
          key: data.key,
          type: data.type,
          section: data.section,
          data: {
            question: data.question,
            options: data.type === 'choice' ? data.options : undefined,
            correct_answers: data.correct_answers,
          },
          is_scorable: data.is_scorable,
        });
      } else {
        // Create
        await createMutation.mutateAsync({
          key: data.key,
          type: data.type,
          section: data.section,
          data: {
            question: data.question,
            options: data.type === 'choice' ? data.options : undefined,
            correct_answers: data.correct_answers,
          },
          is_scorable: data.is_scorable,
        });
      }

      // Reset form
      setSelectedQuestion(null);
      setFormData(null);
    } catch (err) {
      console.error('Error saving question:', err);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      await deleteMutation.mutateAsync(showDeleteConfirm);
      setShowDeleteConfirm(null);
      if (selectedQuestion?.id === showDeleteConfirm) {
        setSelectedQuestion(null);
        setFormData(null);
      }
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  // Handle edit
  const handleEdit = useCallback((question: QuizQuestion) => {
    setSelectedQuestion(question);
    setFormData({
      key: question.key,
      type: question.type,
      section: question.section,
      question: question.data.question,
      options: question.data.options || ['', ''],
      correct_answers: question.data.correct_answers,
      is_scorable: question.is_scorable,
    });
  }, []);

  // Handle reorder
  const handleReorder = useCallback(
    (orders: { id: string; sort_order: number }[]) => {
      reorderMutation.mutate(orders);
    },
    [reorderMutation]
  );

  // Handle import
  const handleImport = async (file: File) => {
    const result = await importMutation.mutateAsync(file);
    return result;
  };

  // Handle add new question in a specific section
  const handleAddQuestion = (_section: QuestionSection) => {
    setSelectedQuestion(null);
    setFormData(null);
    // The form will show with the selected section
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setSelectedQuestion(null);
    setFormData(null);
  };

  // Get existing keys for validation
  const existingKeys = questions.map((q) => q.key);

  if (!eventSlug || !adminKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Faltan parámetros</p>
          <p className="text-gray-500 text-sm">
            Se requiere <code>?event=...</code> y <code>?key=...</code>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="text-4xl"
        >
          ⚙️
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error al cargar</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-pink-50 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="font-display text-xl text-gray-800">
                Editor de Preguntas
              </h1>
              <p className="text-xs text-gray-500">{eventSlug}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {questions.length} pregunta{questions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Question List */}
          <div className="lg:col-span-2 space-y-4">
            <QuestionList
              questions={questions}
              onReorder={handleReorder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
            />

            {/* Import/Export */}
            <ImportExportPanel
              onExport={exportQuestions}
              onImport={handleImport}
              isImporting={importMutation.isPending}
              questionCount={questions.length}
            />
          </div>

          {/* Right Column - Form */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {selectedQuestion || formData ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <QuestionForm
                    question={selectedQuestion}
                    existingKeys={existingKeys}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                    onCancel={handleCancelForm}
                  />
                  <div className="mt-4">
                    <QuestionPreview data={formData || {
                      key: '',
                      type: selectedQuestion?.type || 'text',
                      section: selectedQuestion?.section || 'favorites',
                      question: selectedQuestion?.data.question || '',
                      options: selectedQuestion?.data.options || ['', ''],
                      correct_answers: selectedQuestion?.data.correct_answers || [],
                      is_scorable: selectedQuestion?.is_scorable ?? true,
                    }} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-100 p-6 text-center"
                >
                  <div className="text-4xl mb-3">✏️</div>
                  <p className="text-gray-600 font-medium">
                    Crear nueva pregunta
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Completa el formulario para agregar una pregunta al quiz
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {(['favorites', 'preferences', 'description'] as QuestionSection[]).map((section) => (
                      <Button
                        key={section}
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => handleAddQuestion(section)}
                      >
                        + {section === 'favorites' ? '⭐' : section === 'preferences' ? '🤔' : '✍️'}{' '}
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="font-display text-lg text-gray-800 mb-2">
                  Eliminar pregunta
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  ¿Estás seguro de eliminar esta pregunta? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={confirmDelete}
                    isLoading={deleteMutation.isPending}
                    className="!bg-red-500 hover:!bg-red-600"
                    icon={<Trash2 size={16} />}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
