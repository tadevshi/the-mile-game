// Question types for the Question Editor

export type QuestionSection = 'favorites' | 'preferences' | 'description';

export interface QuizQuestion {
  id: string;
  event_id: string;
  key: string;
  section: QuestionSection;
  question_text: string;
  correct_answers: string[];
  options: string[] | null;
  sort_order: number;
  is_scorable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionRequest {
  section: QuestionSection;
  key: string;
  question_text: string;
  correct_answers: string[];
  options?: string[]; // null for text, array for choice
  sort_order?: number;
  is_scorable: boolean;
}

export interface UpdateQuestionRequest {
  section?: QuestionSection;
  key?: string;
  question_text?: string;
  correct_answers?: string[];
  options?: string[] | null;
  sort_order?: number;
  is_scorable?: boolean;
}

export interface ReorderUpdate {
  id: string;
  sort_order: number;
}

export interface QuestionFormData {
  key: string;
  section: QuestionSection;
  question_text: string;
  options: string[];
  correct_answers: string[];
  is_scorable: boolean;
}

export const SECTION_LABELS: Record<QuestionSection, string> = {
  favorites: 'Favoritos',
  preferences: 'Preferencias',
  description: 'Descripción',
};

export const INITIAL_QUESTION_FORM: QuestionFormData = {
  key: '',
  section: 'favorites',
  question_text: '',
  options: ['', ''],
  correct_answers: [],
  is_scorable: true,
};
