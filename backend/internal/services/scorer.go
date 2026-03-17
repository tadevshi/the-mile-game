package services

import (
	"github.com/the-mile-game/backend/internal/models"
)

// Scorer calcula el puntaje del quiz usando normalización de texto
type Scorer struct {
	normalizer         *Normalizer
	correctFavorites   map[string][]string // Respuestas YA NORMALIZADAS (múltiples válidas por pregunta)
	correctPreferences map[string]string   // Respuestas YA NORMALIZADAS
}

// NewScorer crea un nuevo calculador de puntajes (modo legacy - hardcoded)
func NewScorer() *Scorer {
	normalizer := NewNormalizer()

	// Definir respuestas correctas y normalizarlas inmediatamente.
	// Cada pregunta puede tener UNA o VARIAS respuestas válidas.
	// Estas son las respuestas que Mile ha definido como correctas.
	rawFavorites := map[string][]string{
		"singer":  {"ricardo arjona"},
		"flower":  {"girasol"},
		"drink":   {"te verde"},
		"disney":  {"la bella y la bestia"},
		"season":  {"primavera"},
		"color":   {"rosado"},
		"dislike": {"las arañas", "madrugar", "el sol"}, // Cualquiera de las tres es correcta
	}

	rawPreferences := map[string]string{
		"coffee":  "te",
		"place":   "playa",
		"weather": "frio",
		"time":    "noche",
		"food":    "sushi",
		"alcohol": "tequila",
	}

	// Normalizar las respuestas correctas para almacenarlas
	normalizedFavorites := make(map[string][]string)
	for key, values := range rawFavorites {
		normalized := make([]string, len(values))
		for i, v := range values {
			normalized[i] = normalizer.NormalizeForStorage(v)
		}
		normalizedFavorites[key] = normalized
	}

	normalizedPreferences := make(map[string]string)
	for key, value := range rawPreferences {
		normalizedPreferences[key] = normalizer.NormalizeForStorage(value)
	}

	return &Scorer{
		normalizer:         normalizer,
		correctFavorites:   normalizedFavorites,
		correctPreferences: normalizedPreferences,
	}
}

// NewScorerWithQuestions crea un scorer con preguntas de la base de datos.
// Las preguntas deben tener sus correct_answers ya normalizados (el repo los deserializa).
func NewScorerWithQuestions(questions []models.QuizQuestion) *Scorer {
	normalizer := NewNormalizer()

	correctFavorites := make(map[string][]string)
	correctPreferences := make(map[string]string)

	for _, q := range questions {
		if !q.IsScorable {
			continue
		}

		// Las respuestas ya vienen normalizadas desde la DB
		correctAnswers := q.CorrectAnswers
		if len(correctAnswers) == 0 {
			continue
		}

		if q.Section == "favorites" {
			// Favoritos pueden tener múltiples respuestas válidas
			correctFavorites[q.Key] = correctAnswers
		} else if q.Section == "preferences" {
			// Preferencias tienen una sola respuesta correcta
			correctPreferences[q.Key] = correctAnswers[0]
		}
	}

	return &Scorer{
		normalizer:         normalizer,
		correctFavorites:   correctFavorites,
		correctPreferences: correctPreferences,
	}
}

// Calculate calcula el puntaje basado en las respuestas del usuario.
// Las respuestas del usuario deben venir ya normalizadas del handler.
func (s *Scorer) Calculate(favorites, preferences map[string]string) int {
	score := 0

	// Puntuar favoritos (7 preguntas)
	// Cada pregunta puede tener múltiples respuestas válidas — basta con que
	// la respuesta del usuario coincida con alguna de ellas.
	for key, correctAnswers := range s.correctFavorites {
		if userAnswer, ok := favorites[key]; ok {
			for _, correctAnswer := range correctAnswers {
				if userAnswer == correctAnswer {
					score++
					break
				}
			}
		}
	}

	// Puntuar preferencias (6 preguntas)
	// Las preferencias son opciones fijas (A/B), siempre una sola respuesta correcta.
	for key, correctAnswer := range s.correctPreferences {
		if userAnswer, ok := preferences[key]; ok {
			if userAnswer == correctAnswer {
				score++
			}
		}
	}

	return score
}

// NormalizeFavorites normaliza un mapa de respuestas de favoritos
// Útil para llamar desde el handler antes de guardar/comparar
func (s *Scorer) NormalizeFavorites(answers map[string]string) map[string]string {
	normalized := make(map[string]string)
	for key, value := range answers {
		normalized[key] = s.normalizer.NormalizeForStorage(value)
	}
	return normalized
}

// NormalizePreferences normaliza un mapa de preferencias
func (s *Scorer) NormalizePreferences(answers map[string]string) map[string]string {
	normalized := make(map[string]string)
	for key, value := range answers {
		// Para preferencias también aplicamos normalización básica
		// (aunque sean opciones fijas, estandarizamos formato)
		normalized[key] = s.normalizer.NormalizeForStorage(value)
	}
	return normalized
}

// GetNormalizer expone el normalizador para uso externo
func (s *Scorer) GetNormalizer() *Normalizer {
	return s.normalizer
}
