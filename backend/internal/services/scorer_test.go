package services

import (
	"testing"
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
				"drink":   "tequila",
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
				"drink":   "vino",
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
				"drink":   "tequila", // correct
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

	// Verificar que las respuestas correctas están normalizadas
	for key, value := range s.correctFavorites {
		expected := s.normalizer.NormalizeForStorage(value)
		// Como almacenamos ya normalizado, debería ser igual
		if value != expected {
			t.Errorf("Correct answer for %s should be normalized: got %q, want %q",
				key, value, expected)
		}
	}
}
