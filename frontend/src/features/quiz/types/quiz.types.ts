// Types del Quiz
export interface Question {
  id: string;
  text: string;
  type: 'text' | 'choice';
}

export interface Answer {
  questionId: string;
  value: string;
}

export interface QuizState {
  answers: Answer[];
  currentStep: number;
}
