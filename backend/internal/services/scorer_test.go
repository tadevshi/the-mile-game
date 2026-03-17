package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

func TestNewScorer(t *testing.T) {
	s := NewScorer()
	if s == nil {
		t.Error("NewScorer() returned nil")
	}
	if s.normalizer == nil {
		t.Error("Scorer should have a normalizer")
	}
	if len(s.correctFavorites) != 7 {
		t.Errorf("Scorer should have 7 favorite questions, got %d", len(s.correctFavorites))
	}
	if len(s.correctPreferences) != 6 {
		t.Errorf("Scorer should have 6 preference questions, got %d", len(s.correctPreferences))
	}
	// Verificar que dislike tiene las 3 respuestas válidas
	if len(s.correctFavorites["dislike"]) != 3 {
		t.Errorf("dislike should have 3 valid answers, got %d", len(s.correctFavorites["dislike"]))
	}
}

func TestCalculate(t *testing.T) {
	s := NewScorer()

	tests := []struct {
		name        string
		favorites   map[string]string
		preferences map[string]string
		expected    int
	}{
		{
			name: "perfect score - all correct",
			favorites: map[string]string{
				"singer":  "ricardo arjona",
				"flower":  "girasol",
				"drink":   "te verde",
				"disney":  "bella y bestia", // "la" es artículo y se elimina, "y" no es artículo
				"season":  "primavera",
				"color":   "rosado",
				"dislike": "aranas", // "las" se elimina
			},
			preferences: map[string]string{
				"coffee":  "te",
				"place":   "playa",
				"weather": "frio",
				"time":    "noche",
				"food":    "sushi",
				"alcohol": "tequila",
			},
			expected: 13,
		},
		{
			name: "dislike - madrugar es correcto",
			favorites: map[string]string{
				"singer":  "ricardo arjona",
				"flower":  "girasol",
				"drink":   "te verde",
				"disney":  "bella y bestia",
				"season":  "primavera",
				"color":   "rosado",
				"dislike": "madrugar",
			},
			preferences: map[string]string{
				"coffee":  "te",
				"place":   "playa",
				"weather": "frio",
				"time":    "noche",
				"food":    "sushi",
				"alcohol": "tequila",
			},
			expected: 13,
		},
		{
			name: "dislike - el sol es correcto",
			favorites: map[string]string{
				"singer":  "ricardo arjona",
				"flower":  "girasol",
				"drink":   "te verde",
				"disney":  "bella y bestia",
				"season":  "primavera",
				"color":   "rosado",
				"dislike": "sol", // "el" se elimina como artículo
			},
			preferences: map[string]string{
				"coffee":  "te",
				"place":   "playa",
				"weather": "frio",
				"time":    "noche",
				"food":    "sushi",
				"alcohol": "tequila",
			},
			expected: 13,
		},
		{
			name: "all wrong",
			favorites: map[string]string{
				"singer":  "shakira",
				"flower":  "rosa",
				"drink":   "cafe",
				"disney":  "frozen",
				"season":  "invierno",
				"color":   "azul",
				"dislike": "trabajar",
			},
			preferences: map[string]string{
				"coffee":  "cafe",
				"place":   "montana",
				"weather": "calor",
				"time":    "dia",
				"food":    "pizza",
				"alcohol": "vino",
			},
			expected: 0,
		},
		{
			name: "half correct",
			favorites: map[string]string{
				"singer":  "ricardo arjona", // correct
				"flower":  "rosa",           // wrong
				"drink":   "te verde",       // correct
				"disney":  "frozen",         // wrong
				"season":  "primavera",      // correct
				"color":   "azul",           // wrong
				"dislike": "aranas",         // correct
			},
			preferences: map[string]string{
				"coffee":  "cafe",    // wrong
				"place":   "playa",   // correct
				"weather": "calor",   // wrong
				"time":    "noche",   // correct
				"food":    "pizza",   // wrong
				"alcohol": "tequila", // correct
			},
			expected: 7, // 4 favorites + 3 preferences
		},
		{
			name: "missing some answers",
			favorites: map[string]string{
				"singer": "ricardo arjona",
				"flower": "girasol",
				// missing rest
			},
			preferences: map[string]string{
				"coffee": "te",
				// missing rest
			},
			expected: 3, // 2 favorites + 1 preference
		},
		{
			name:        "empty answers",
			favorites:   map[string]string{},
			preferences: map[string]string{},
			expected:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := s.Calculate(tt.favorites, tt.preferences)
			if score != tt.expected {
				t.Errorf("Calculate() = %d, want %d", score, tt.expected)
			}
		})
	}
}

func TestNormalizeFavorites(t *testing.T) {
	s := NewScorer()

	input := map[string]string{
		"singer": "RICARDO ARJONA!",
		"flower": "  Girasol  ",
	}

	result := s.NormalizeFavorites(input)

	expected := map[string]string{
		"singer": "ricardo arjona",
		"flower": "girasol",
	}

	for key, expectedValue := range expected {
		if result[key] != expectedValue {
			t.Errorf("NormalizeFavorites()[%s] = %q, want %q",
				key, result[key], expectedValue)
		}
	}
}

func TestNormalizePreferences(t *testing.T) {
	s := NewScorer()

	input := map[string]string{
		"coffee": "TÉ",
		"place":  "  PLAYA  ",
	}

	result := s.NormalizePreferences(input)

	expected := map[string]string{
		"coffee": "te",
		"place":  "playa",
	}

	for key, expectedValue := range expected {
		if result[key] != expectedValue {
			t.Errorf("NormalizePreferences()[%s] = %q, want %q",
				key, result[key], expectedValue)
		}
	}
}

func TestGetNormalizer(t *testing.T) {
	s := NewScorer()
	normalizer := s.GetNormalizer()

	if normalizer == nil {
		t.Error("GetNormalizer() returned nil")
	}

	// Verificar que podemos usar el normalizador
	result := normalizer.NormalizeForStorage("TEST")
	if result != "test" {
		t.Errorf("Normalizer from GetNormalizer() not working correctly")
	}
}

func TestCorrectAnswersAreNormalized(t *testing.T) {
	s := NewScorer()

	// Verificar que todas las respuestas correctas de favoritos están normalizadas
	for key, values := range s.correctFavorites {
		for i, value := range values {
			expected := s.normalizer.NormalizeForStorage(value)
			if value != expected {
				t.Errorf("Correct answer[%d] for %s should be normalized: got %q, want %q",
					i, key, value, expected)
			}
		}
	}
}

func TestDislikeAcceptsAllValidAnswers(t *testing.T) {
	s := NewScorer()

	validDislikes := []string{
		"aranas",   // "las arañas" normalizado
		"madrugar", // madrugar normalizado
		"sol",      // "el sol" normalizado (artículo eliminado)
	}

	basePreferences := map[string]string{
		"coffee":  "te",
		"place":   "playa",
		"weather": "frio",
		"time":    "noche",
		"food":    "sushi",
		"alcohol": "tequila",
	}

	baseFavorites := map[string]string{
		"singer": "ricardo arjona",
		"flower": "girasol",
		"drink":  "te verde",
		"disney": "bella y bestia",
		"season": "primavera",
		"color":  "rosado",
	}

	for _, dislike := range validDislikes {
		t.Run("dislike="+dislike, func(t *testing.T) {
			favorites := make(map[string]string)
			for k, v := range baseFavorites {
				favorites[k] = v
			}
			favorites["dislike"] = dislike

			score := s.Calculate(favorites, basePreferences)
			if score != 13 {
				t.Errorf("dislike=%q should give perfect score 13, got %d", dislike, score)
			}
		})
	}
}

func TestNewScorerWithQuestions(t *testing.T) {
	// Crear preguntas en formato DB (ya normalizadas)
	questions := []models.QuizQuestion{
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "favorites",
			Key:            "singer",
			QuestionText:   "¿Cantante favorito?",
			CorrectAnswers: []string{"ricardo arjona"},
			SortOrder:      1,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "favorites",
			Key:            "flower",
			QuestionText:   "¿Flor favorita?",
			CorrectAnswers: []string{"girasol"},
			SortOrder:      2,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "favorites",
			Key:            "dislike",
			QuestionText:   "¿Algo que no le guste?",
			CorrectAnswers: []string{"aranas", "madrugar", "sol"}, // Multiple valid answers
			SortOrder:      7,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "preferences",
			Key:            "coffee",
			QuestionText:   "¿Café o Té?",
			CorrectAnswers: []string{"te"},
			Options:        []string{"Café", "Té"},
			SortOrder:      1,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "preferences",
			Key:            "place",
			QuestionText:   "¿Playa o Montaña?",
			CorrectAnswers: []string{"playa"},
			Options:        []string{"Playa", "Montaña"},
			SortOrder:      2,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "description",
			Key:            "describe_me",
			QuestionText:   "¿Descríbeme en una oración?",
			CorrectAnswers: []string{},
			SortOrder:      1,
			IsScorable:     false, // Not scorable
		},
	}

	s := NewScorerWithQuestions(questions)

	if s == nil {
		t.Error("NewScorerWithQuestions() returned nil")
	}
	if s.normalizer == nil {
		t.Error("Scorer should have a normalizer")
	}

	// Verificar que cargó las preguntas de favoritos
	if len(s.correctFavorites) != 3 {
		t.Errorf("Scorer should have 3 favorite questions, got %d", len(s.correctFavorites))
	}

	// Verificar que dislike tiene las 3 respuestas válidas
	if len(s.correctFavorites["dislike"]) != 3 {
		t.Errorf("dislike should have 3 valid answers, got %d", len(s.correctFavorites["dislike"]))
	}

	// Verificar que cargó las preguntas de preferencias
	if len(s.correctPreferences) != 2 {
		t.Errorf("Scorer should have 2 preference questions, got %d", len(s.correctPreferences))
	}
}

func TestScorerWithDBQuestions_Calculate(t *testing.T) {
	// Crear preguntas en formato DB (ya normalizadas)
	questions := []models.QuizQuestion{
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "favorites",
			Key:            "singer",
			QuestionText:   "¿Cantante favorito?",
			CorrectAnswers: []string{"ricardo arjona"},
			SortOrder:      1,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "favorites",
			Key:            "flower",
			QuestionText:   "¿Flor favorita?",
			CorrectAnswers: []string{"girasol"},
			SortOrder:      2,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "favorites",
			Key:            "dislike",
			QuestionText:   "¿Algo que no le guste?",
			CorrectAnswers: []string{"aranas", "madrugar", "sol"},
			SortOrder:      7,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "preferences",
			Key:            "coffee",
			QuestionText:   "¿Café o Té?",
			CorrectAnswers: []string{"te"},
			Options:        []string{"Café", "Té"},
			SortOrder:      1,
			IsScorable:     true,
		},
		{
			ID:             uuid.New(),
			EventID:        uuid.Nil,
			Section:        "preferences",
			Key:            "place",
			QuestionText:   "¿Playa o Montaña?",
			CorrectAnswers: []string{"playa"},
			Options:        []string{"Playa", "Montaña"},
			SortOrder:      2,
			IsScorable:     true,
		},
	}

	s := NewScorerWithQuestions(questions)

	tests := []struct {
		name        string
		favorites   map[string]string
		preferences map[string]string
		expected    int
	}{
		{
			name: "perfect score",
			favorites: map[string]string{
				"singer":  "ricardo arjona",
				"flower":  "girasol",
				"dislike": "aranas",
			},
			preferences: map[string]string{
				"coffee": "te",
				"place":  "playa",
			},
			expected: 5,
		},
		{
			name: "dislike accepts madrugar",
			favorites: map[string]string{
				"singer":  "ricardo arjona",
				"flower":  "girasol",
				"dislike": "madrugar",
			},
			preferences: map[string]string{
				"coffee": "te",
				"place":  "playa",
			},
			expected: 5,
		},
		{
			name: "all wrong",
			favorites: map[string]string{
				"singer":  "shakira",
				"flower":  "rosa",
				"dislike": "nadar",
			},
			preferences: map[string]string{
				"coffee": "cafe",
				"place":  "montana",
			},
			expected: 0,
		},
		{
			name:        "empty answers",
			favorites:   map[string]string{},
			preferences: map[string]string{},
			expected:    0,
		},
		{
			name: "partial score",
			favorites: map[string]string{
				"singer": "ricardo arjona", // correct
				"flower": "rosa",           // wrong
			},
			preferences: map[string]string{
				"coffee": "cafe",  // wrong
				"place":  "playa", // correct
			},
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := s.Calculate(tt.favorites, tt.preferences)
			if score != tt.expected {
				t.Errorf("Calculate() = %d, want %d", score, tt.expected)
			}
		})
	}
}

func TestScorerWithQuestions_EmptyQuestions(t *testing.T) {
	s := NewScorerWithQuestions([]models.QuizQuestion{})

	if s == nil {
		t.Error("NewScorerWithQuestions() returned nil")
	}

	// Should handle empty questions gracefully
	score := s.Calculate(
		map[string]string{"singer": "ricardo arjona"},
		map[string]string{"coffee": "te"},
	)
	if score != 0 {
		t.Errorf("Expected 0 score with no questions, got %d", score)
	}
}
