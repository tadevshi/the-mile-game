import type { FavoriteQuestion, PreferenceQuestion } from './quiz.types';

export const FAVORITE_QUESTIONS: FavoriteQuestion[] = [
  { id: 'singer', label: '¿Cantante favorito?' },
  { id: 'flower', label: '¿Flor favorita?' },
  { id: 'drink', label: '¿Cuál es mi bebida favorita?' },
  { id: 'disney', label: '¿Película de Disney favorita?' },
  { id: 'season', label: '¿Estación del año preferida?' },
  { id: 'color', label: '¿Cuál es mi color favorito?' },
  { id: 'dislike', label: '¿Menciona algo que no me guste?' },
];

export const PREFERENCE_QUESTIONS: PreferenceQuestion[] = [
  { id: 'coffee', label: '¿Café o Té?', options: ['Café', 'Té'] },
  { id: 'place', label: '¿Playa o Montaña?', options: ['Playa', 'Montaña'] },
  { id: 'weather', label: '¿Frío o Calor?', options: ['Frío', 'Calor'] },
  { id: 'time', label: '¿Día o Noche?', options: ['Día', 'Noche'] },
  { id: 'food', label: '¿Pizza o Sushi?', options: ['Pizza', 'Sushi'] },
  { id: 'alcohol', label: '¿Tequila o Vino?', options: ['Tequila', 'Vino'] },
];

// Total de preguntas — CONSTANTE fija, no depende del estado de las respuestas
export const TOTAL_QUESTIONS =
  FAVORITE_QUESTIONS.length + PREFERENCE_QUESTIONS.length + 1; // +1 descripción

// Puntaje máximo — la descripción no es puntuable, solo feed
export const MAX_SCORE = FAVORITE_QUESTIONS.length + PREFERENCE_QUESTIONS.length;
