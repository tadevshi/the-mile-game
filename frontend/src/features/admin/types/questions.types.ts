// Question types for the Question Editor

export type QuestionType = 'text' | 'choice' | 'boolean';
export type QuestionSection = 'favorites' | 'preferences' | 'description';

export interface QuestionData {
  question: string;
  options?: string[]; // for choice type
  correct_answers: string[];
}

export interface QuizQuestion {
  id: string;
  event_id: string;
  key: string;
  type: QuestionType;
  section: QuestionSection;
  data: QuestionData;
  sort_order: number;
  is_scorable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionRequest {
  key: string;
  type: QuestionType;
  section: QuestionSection;
  data: QuestionData;
  sort_order?: number;
  is_scorable: boolean;
}

export interface UpdateQuestionRequest {
  key?: string;
  type?: QuestionType;
  section?: QuestionSection;
  data?: QuestionData;
  sort_order?: number;
  is_scorable?: boolean;
}

export interface ReorderUpdate {
  id: string;
  sort_order: number;
}

export interface ImportQuestion {
  key: string;
  type: QuestionType;
  section: QuestionSection;
  data: QuestionData;
  is_scorable: boolean;
}

export interface QuestionFormData {
  key: string;
  type: QuestionType;
  section: QuestionSection;
  question: string;
  options: string[];
  correct_answers: string[];
  is_scorable: boolean;
}

export const SECTION_LABELS: Record<QuestionSection, string> = {
  favorites: 'Favoritos',
  preferences: 'Preferencias',
  description: 'Descripción',
};

export const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texto',
  choice: 'Opción múltiple',
  boolean: 'Verdadero/Falso',
};

export const INITIAL_QUESTION_FORM: QuestionFormData = {
  key: '',
  type: 'text',
  section: 'favorites',
  question: '',
  options: ['', ''],
  correct_answers: [],
  is_scorable: true,
};
