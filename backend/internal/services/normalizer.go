package services

import (
	"regexp"
	"strings"
)

// Normalizer maneja la normalización de texto para comparaciones
type Normalizer struct {
	// Artículos en español a ignorar en comparaciones
	articles []string
}

// NewNormalizer crea un nuevo normalizador
func NewNormalizer() *Normalizer {
	return &Normalizer{
		articles: []string{
			"el", "la", "los", "las",
			"un", "una", "unos", "unas",
			"lo", "le", "les",
		},
	}
}

// Normalize normaliza un texto siguiendo las reglas definidas:
// - Minúsculas
// - Sin acentos
// - Sin puntuación
// - Espacios normalizados
// - Sin artículos (opcional)
func (n *Normalizer) Normalize(input string, removeArticles bool) string {
	if input == "" {
		return ""
	}

	// 1. Convertir a minúsculas y trim
	result := strings.ToLower(strings.TrimSpace(input))

	// 2. Eliminar acentos
	result = n.removeAccents(result)

	// 3. Eliminar puntuación (mantener solo letras, números y espacios)
	result = regexp.MustCompile(`[^a-z0-9\s]+`).ReplaceAllString(result, "")

	// 4. Normalizar espacios múltiples
	result = regexp.MustCompile(`\s+`).ReplaceAllString(result, " ")

	// 5. Eliminar artículos si se solicita
	if removeArticles {
		result = n.removeArticles(result)
	}

	return strings.TrimSpace(result)
}

// NormalizeForStorage normaliza para almacenar en DB (sin artículos)
func (n *Normalizer) NormalizeForStorage(input string) string {
	return n.Normalize(input, true)
}

// NormalizeForComparison normaliza para comparar (sin artículos)
func (n *Normalizer) NormalizeForComparison(input string) string {
	return n.Normalize(input, true)
}

// Compare compara dos respuestas normalizadas
// Retorna true si son equivalentes
func (n *Normalizer) Compare(userAnswer, correctAnswer string) bool {
	userNorm := n.NormalizeForComparison(userAnswer)
	correctNorm := n.NormalizeForComparison(correctAnswer)

	// Comparación exacta después de normalizar
	return userNorm == correctNorm
}

// Contains verifica si la respuesta del usuario está contenida en la correcta
// o viceversa (útil para respuestas parciales)
func (n *Normalizer) Contains(userAnswer, correctAnswer string) bool {
	userNorm := n.NormalizeForComparison(userAnswer)
	correctNorm := n.NormalizeForComparison(correctAnswer)

	// Verificar si una contiene a la otra
	return strings.Contains(userNorm, correctNorm) ||
		strings.Contains(correctNorm, userNorm)
}

// removeAccents elimina los acentos de un texto
func (n *Normalizer) removeAccents(input string) string {
	// Mapeo de caracteres acentuados a sin acentos
	accentMap := map[rune]rune{
		'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
		'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
		'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o', 'ü': 'u',
		'Ä': 'A', 'Ë': 'E', 'Ï': 'I', 'Ö': 'O', 'Ü': 'U',
		'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
		'À': 'A', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U',
		'ñ': 'n', 'Ñ': 'N',
	}

	result := []rune(input)
	for i, r := range result {
		if replacement, ok := accentMap[r]; ok {
			result[i] = replacement
		}
	}

	return string(result)
}

// removeArticles elimina los artículos del inicio y del medio del texto
func (n *Normalizer) removeArticles(input string) string {
	words := strings.Fields(input)
	var result []string

	for _, word := range words {
		if !n.isArticle(word) {
			result = append(result, word)
		}
	}

	return strings.Join(result, " ")
}

// isArticle verifica si una palabra es un artículo
func (n *Normalizer) isArticle(word string) bool {
	for _, article := range n.articles {
		if word == article {
			return true
		}
	}
	return false
}

// SanitizeDescription sanitiza la descripción (no elimina artículos, solo limpia)
func (n *Normalizer) SanitizeDescription(input string) string {
	if input == "" {
		return ""
	}

	// 1. Trim
	result := strings.TrimSpace(input)

	// 2. Normalizar espacios múltiples
	result = regexp.MustCompile(`\s+`).ReplaceAllString(result, " ")

	// 3. Limitar longitud máxima (500 caracteres)
	if len(result) > 500 {
		runes := []rune(result)
		if len(runes) > 500 {
			result = string(runes[:500])
		}
	}

	return strings.TrimSpace(result)
}
