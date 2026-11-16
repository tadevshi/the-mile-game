package repository

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// QuizRepository maneja las operaciones de base de datos para el quiz
type QuizRepository struct {
	db *sql.DB
}

// NewQuizRepository crea un nuevo repositorio de quiz
func NewQuizRepository(db *sql.DB) *QuizRepository {
	return &QuizRepository{db: db}
}

// SaveAnswers guarda las respuestas de un jugador
func (r *QuizRepository) SaveAnswers(playerID uuid.UUID, favorites, preferences map[string]string, description string) error {
	id := uuid.New()
	createdAt := time.Now()

	// Convertir maps a JSON
	favoritesJSON, err := json.Marshal(favorites)
	if err != nil {
		return err
	}

	preferencesJSON, err := json.Marshal(preferences)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO quiz_answers (id, player_id, favorites, preferences, description, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (player_id) DO UPDATE SET
			favorites = EXCLUDED.favorites,
			preferences = EXCLUDED.preferences,
			description = EXCLUDED.description,
			created_at = EXCLUDED.created_at
	`

	_, err = r.db.Exec(query, id, playerID, favoritesJSON, preferencesJSON, description, createdAt)
	return err
}

// ListDescriptions devuelve todas las descripciones no vacías (anónimas)
func (r *QuizRepository) ListDescriptions() ([]string, error) {
	query := `
		SELECT description
		FROM quiz_answers
		WHERE TRIM(description) != ''
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var descriptions []string
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		descriptions = append(descriptions, d)
	}

	if descriptions == nil {
		descriptions = []string{}
	}
	return descriptions, nil
}

// DescriptionEntry pairs a quiz description with the event that owns the player
// it belongs to. Rows without an event keep the zero UUID.
type DescriptionEntry struct {
	Description string
	EventID     uuid.UUID
}

// ListDescriptionsWithEvent devuelve todas las descripciones no vacías junto con
// el evento al que pertenece el jugador que las respondió.
func (r *QuizRepository) ListDescriptionsWithEvent() ([]DescriptionEntry, error) {
	query := `
		SELECT q.description, p.event_id
		FROM quiz_answers q
		LEFT JOIN players p ON p.id = q.player_id
		WHERE TRIM(q.description) != ''
		ORDER BY q.created_at ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []DescriptionEntry
	for rows.Next() {
		var entry DescriptionEntry
		if err := rows.Scan(&entry.Description, &entry.EventID); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetAnswersByPlayerID obtiene las respuestas de un jugador
func (r *QuizRepository) GetAnswersByPlayerID(playerID uuid.UUID) (*models.QuizAnswers, error) {
	query := `
		SELECT id, player_id, favorites, preferences, description, created_at
		FROM quiz_answers
		WHERE player_id = $1
	`

	var answers models.QuizAnswers
	var favoritesJSON, preferencesJSON []byte

	err := r.db.QueryRow(query, playerID).Scan(
		&answers.ID, &answers.PlayerID, &favoritesJSON, &preferencesJSON, &answers.Description, &answers.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Deserializar JSON
	if err := json.Unmarshal(favoritesJSON, &answers.Favorites); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(preferencesJSON, &answers.Preferences); err != nil {
		return nil, err
	}

	return &answers, nil
}
