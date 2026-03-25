// Tipos para preguntas del quiz — player-facing (sin correct_answers)
// Estos coinciden con el backend: QuizQuestionResponse
export interface QuizQuestionResponse {
  id: string;
  section: 'favorites' | 'preferences' | 'description';
  key: string;
  question_text: string;
  options: string[] | null; // vacío para favoritos/descripción, array para preferencias
  sort_order: number;
  is_scorable: boolean;
}
