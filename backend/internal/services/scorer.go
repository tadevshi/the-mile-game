package services

// Scorer calcula el puntaje del quiz usando normalización de texto
type Scorer struct {
	normalizer         *Normalizer
	correctFavorites   map[string]string // Respuestas YA NORMALIZADAS
	correctPreferences map[string]string // Respuestas YA NORMALIZADAS
}

// NewScorer crea un nuevo calculador de puntajes
func NewScorer() *Scorer {
	normalizer := NewNormalizer()

	// Definir respuestas correctas y normalizarlas inmediatamente
	// Estas son las respuestas que Mile ha definido como correctas
	rawFavorites := map[string]string{
		"singer":  "ricardo arjona",
		"flower":  "girasol",
		"drink":   "te verde",
		"disney":  "la bella y la bestia",
		"season":  "primavera",
		"color":   "rosado",
		"dislike": "las arañas",
	}

	rawPreferences := map[string]string{
		"coffee":  "te",
		"place":   "playa",
		"weather": "frio",
		"time":    "noche",
		"food":    "sushi",
		"drink":   "tequila",
	}

	// Normalizar las respuestas correctas para almacenarlas
	normalizedFavorites := make(map[string]string)
	for key, value := range rawFavorites {
		normalizedFavorites[key] = normalizer.NormalizeForStorage(value)
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

// Calculate calcula el puntaje basado en las respuestas del usuario
// Las respuestas del usuario deben venir ya normalizadas del handler
func (s *Scorer) Calculate(favorites, preferences map[string]string) int {
	score := 0

	// Puntuar favoritos (7 preguntas)
	// Las respuestas del usuario ya vienen normalizadas desde el handler
	for key, correctAnswer := range s.correctFavorites {
		if userAnswer, ok := favorites[key]; ok {
			// Comparación directa ya que ambas están normalizadas
			if userAnswer == correctAnswer {
				score++
			}
		}
	}

	// Puntuar preferencias (6 preguntas)
	// Las preferencias son opciones fijas (A/B), no necesitan normalización
	// pero las almacenamos normalizadas por consistencia
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
