package services

import (
	"testing"
)

func TestNewNormalizer(t *testing.T) {
	n := NewNormalizer()
	if n == nil {
		t.Error("NewNormalizer() returned nil")
	}
	if len(n.articles) == 0 {
		t.Error("Normalizer should have articles defined")
	}
}

func TestNormalize(t *testing.T) {
	n := NewNormalizer()

	tests := []struct {
		name           string
		input          string
		removeArticles bool
		expected       string
	}{
		{
			name:           "lowercase conversion",
			input:          "TAYLOR SWIFT",
			removeArticles: true,
			expected:       "taylor swift",
		},
		{
			name:           "remove accents",
			input:          "café",
			removeArticles: true,
			expected:       "cafe",
		},
		{
			name:           "remove punctuation",
			input:          "La Sirenita!",
			removeArticles: true,
			expected:       "sirenita",
		},
		{
			name:           "remove articles",
			input:          "El Desorden",
			removeArticles: true,
			expected:       "desorden",
		},
		{
			name:           "complex case",
			input:          "  TAYLOR   SWIFT!  ",
			removeArticles: true,
			expected:       "taylor swift",
		},
		{
			name:           "keep articles when requested",
			input:          "El Desorden",
			removeArticles: false,
			expected:       "el desorden",
		},
		{
			name:           "empty string",
			input:          "",
			removeArticles: true,
			expected:       "",
		},
		{
			name:           "with numbers",
			input:          "Toy Story 2",
			removeArticles: true,
			expected:       "toy story 2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := n.Normalize(tt.input, tt.removeArticles)
			if result != tt.expected {
				t.Errorf("Normalize(%q, %v) = %q, want %q",
					tt.input, tt.removeArticles, result, tt.expected)
			}
		})
	}
}

func TestCompare(t *testing.T) {
	n := NewNormalizer()

	tests := []struct {
		name          string
		userAnswer    string
		correctAnswer string
		expected      bool
	}{
		{
			name:          "exact match",
			userAnswer:    "Taylor Swift",
			correctAnswer: "Taylor Swift",
			expected:      true,
		},
		{
			name:          "different case",
			userAnswer:    "TAYLOR SWIFT",
			correctAnswer: "taylor swift",
			expected:      true,
		},
		{
			name:          "with accents",
			userAnswer:    "café",
			correctAnswer: "cafe",
			expected:      true,
		},
		{
			name:          "with article variation",
			userAnswer:    "Sirenita",
			correctAnswer: "La Sirenita",
			expected:      true,
		},
		{
			name:          "with punctuation",
			userAnswer:    "La Sirenita!",
			correctAnswer: "La Sirenita",
			expected:      true,
		},
		{
			name:          "no match",
			userAnswer:    "Shakira",
			correctAnswer: "Taylor Swift",
			expected:      false,
		},
		{
			name:          "partial match should not count",
			userAnswer:    "Taylor",
			correctAnswer: "Taylor Swift",
			expected:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := n.Compare(tt.userAnswer, tt.correctAnswer)
			if result != tt.expected {
				t.Errorf("Compare(%q, %q) = %v, want %v",
					tt.userAnswer, tt.correctAnswer, result, tt.expected)
			}
		})
	}
}

func TestContains(t *testing.T) {
	n := NewNormalizer()

	tests := []struct {
		name          string
		userAnswer    string
		correctAnswer string
		expected      bool
	}{
		{
			name:          "user contains correct",
			userAnswer:    "Taylor Swift",
			correctAnswer: "Taylor",
			expected:      true,
		},
		{
			name:          "correct contains user",
			userAnswer:    "Taylor",
			correctAnswer: "Taylor Swift",
			expected:      true,
		},
		{
			name:          "no containment",
			userAnswer:    "Shakira",
			correctAnswer: "Taylor Swift",
			expected:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := n.Contains(tt.userAnswer, tt.correctAnswer)
			if result != tt.expected {
				t.Errorf("Contains(%q, %q) = %v, want %v",
					tt.userAnswer, tt.correctAnswer, result, tt.expected)
			}
		})
	}
}

func TestSanitizeDescription(t *testing.T) {
	n := NewNormalizer()

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "trim spaces",
			input:    "  Hello World  ",
			expected: "Hello World",
		},
		{
			name:     "normalize multiple spaces",
			input:    "Hello    World",
			expected: "Hello World",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "long description truncated",
			input:    string(make([]byte, 600)),
			expected: string(make([]byte, 500)),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := n.SanitizeDescription(tt.input)
			if result != tt.expected {
				t.Errorf("SanitizeDescription() length = %d, want %d",
					len(result), len(tt.expected))
			}
		})
	}
}
