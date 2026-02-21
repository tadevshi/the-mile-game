// Types del Quiz — preguntas usadas en QuizPage
export interface FavoriteQuestion {
  id: string;
  label: string;
}

export interface PreferenceQuestion {
  id: string;
  label: string;
  options: [string, string];
}
