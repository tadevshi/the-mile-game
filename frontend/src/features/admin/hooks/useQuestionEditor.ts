import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import type { 
  QuizQuestion, 
  CreateQuestionRequest, 
  UpdateQuestionRequest, 
  ReorderUpdate,
  QuestionSection 
} from '../types/questions.types';

const QUESTIONS_KEY = 'questions';

interface MutationContext {
  previousQuestions: QuizQuestion[] | undefined;
}

interface UseQuestionEditorReturn {
  questions: QuizQuestion[];
  isLoading: boolean;
  error: string | null;
  createMutation: UseMutationResult<QuizQuestion, Error, CreateQuestionRequest, MutationContext>;
  updateMutation: UseMutationResult<QuizQuestion, Error, { id: string } & UpdateQuestionRequest, MutationContext>;
  deleteMutation: UseMutationResult<{ message: string }, Error, string, MutationContext>;
  reorderMutation: UseMutationResult<{ message: string }, Error, ReorderUpdate[], MutationContext>;
  importMutation: UseMutationResult<{ imported: number; warnings?: string[] }, Error, File, unknown>;
  exportQuestions: () => Promise<void>;
  refetch: () => void;
}

export function useQuestionEditor(eventSlug: string): UseQuestionEditorReturn {
  const queryClient = useQueryClient();
  const questionsKey = [QUESTIONS_KEY, eventSlug];

  // Fetch questions
  const { data: questions = [], isLoading, error, refetch } = useQuery<QuizQuestion[]>({
    queryKey: questionsKey,
    queryFn: () => api.listQuestions(eventSlug),
    enabled: !!eventSlug,
  });

  // Create mutation
  const createMutation = useMutation<QuizQuestion, Error, CreateQuestionRequest, MutationContext>({
    mutationFn: (data) => api.createQuestion(eventSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsKey });
    },
  });

  // Update mutation
  const updateMutation = useMutation<QuizQuestion, Error, { id: string } & UpdateQuestionRequest, MutationContext>({
    mutationFn: ({ id, ...data }) => api.updateQuestion(id, data),
    onMutate: async ({ id, ...newData }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: questionsKey });
      const previousQuestions = queryClient.getQueryData<QuizQuestion[]>(questionsKey);

      if (previousQuestions) {
        queryClient.setQueryData<QuizQuestion[]>(
          questionsKey,
          previousQuestions.map((q) => (q.id === id ? { ...q, ...newData, updated_at: new Date().toISOString() } : q))
        );
      }

      return { previousQuestions };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousQuestions) {
        queryClient.setQueryData(questionsKey, context.previousQuestions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: questionsKey });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation<{ message: string }, Error, string, MutationContext>({
    mutationFn: (id) => api.deleteQuestion(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: questionsKey });
      const previousQuestions = queryClient.getQueryData<QuizQuestion[]>(questionsKey);

      if (previousQuestions) {
        queryClient.setQueryData<QuizQuestion[]>(
          questionsKey,
          previousQuestions.filter((q) => q.id !== id)
        );
      }

      return { previousQuestions };
    },
    onError: (_err, _id, context) => {
      if (context?.previousQuestions) {
        queryClient.setQueryData(questionsKey, context.previousQuestions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: questionsKey });
    },
  });

  // Reorder mutation with optimistic update
  const reorderMutation = useMutation<{ message: string }, Error, ReorderUpdate[], MutationContext>({
    mutationFn: (orders) => api.reorderQuestions(eventSlug, orders),
    onMutate: async (orders) => {
      await queryClient.cancelQueries({ queryKey: questionsKey });
      const previousQuestions = queryClient.getQueryData<QuizQuestion[]>(questionsKey);

      if (previousQuestions) {
        // Apply the new order optimistically
        const reordered = [...previousQuestions].map((q) => {
          const newOrder = orders.find((o) => o.id === q.id);
          return newOrder ? { ...q, sort_order: newOrder.sort_order } : q;
        });
        // Sort by the new order
        reordered.sort((a, b) => a.sort_order - b.sort_order);
        queryClient.setQueryData<QuizQuestion[]>(questionsKey, reordered);
      }

      return { previousQuestions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQuestions) {
        queryClient.setQueryData(questionsKey, context.previousQuestions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: questionsKey });
    },
  });

  // Import mutation - reads file and sends JSON array to backend
  const importMutation = useMutation<{ imported: number; warnings?: string[] }, Error, File>({
    mutationFn: async (file) => {
      const text = await file.text();
      const questions = JSON.parse(text);
      return api.importQuestions(eventSlug, questions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsKey });
    },
  });

  // Export function
  const exportQuestions = async () => {
    const data = await api.exportQuestions(eventSlug);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventSlug}-questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    questions,
    isLoading,
    error: error ? (error as Error).message : null,
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
    importMutation,
    exportQuestions,
    refetch,
  };
}

// Helper to group questions by section
export function groupQuestionsBySection(questions: QuizQuestion[]): Record<QuestionSection, QuizQuestion[]> {
  return {
    favorites: questions
      .filter((q) => q.section === 'favorites')
      .sort((a, b) => a.sort_order - b.sort_order),
    preferences: questions
      .filter((q) => q.section === 'preferences')
      .sort((a, b) => a.sort_order - b.sort_order),
    description: questions
      .filter((q) => q.section === 'description')
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}
