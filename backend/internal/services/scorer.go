package services

// Scorer calcula el puntaje del quiz
type Scorer struct {
	correctFavorites   map[string]string
	correctPreferences map[string]string
}

// NewScorer crea un nuevo calculador de puntajes
func NewScorer() *Scorer {
	return &Scorer{
		correctFavorites: map[string]string{
			"singer":  "Taylor Swift",
			"flower":  "Rosa",
			"drink":   "Café",
			"disney":  "La Sirenita",
			"season":  "Primavera",
			"color":   "Rosa",
			"dislike": "El desorden",
		},
		correctPreferences: map[string]string{
			"coffee":  "Café",
			"place":   "Playa",
			"weather": "Calor",
			"time":    "Noche",
			"food":    "Sushi",
			"drink":   "Vino",
		},
	}
}

// Calculate calcula el puntaje basado en las respuestas
func (s *Scorer) Calculate(favorites, preferences map[string]string) int {
	score := 0

	// Puntuar favoritos (7 preguntas)
	for key, correctAnswer := range s.correctFavorites {
		if userAnswer, ok := favorites[key]; ok {
			if equalsIgnoreCase(userAnswer, correctAnswer) {
				score++
			}
		}
	}

	// Puntuar preferencias (6 preguntas)
	for key, correctAnswer := range s.correctPreferences {
		if userAnswer, ok := preferences[key]; ok {
			if userAnswer == correctAnswer {
				score++
			}
		}
	}

	return score
}

// equalsIgnoreCase compara dos strings sin distinguir mayúsculas/minúsculas
func equalsIgnoreCase(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] && a[i]^32 != b[i] {
			return false
		}
	}
	return true
}
