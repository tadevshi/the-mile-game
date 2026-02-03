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
