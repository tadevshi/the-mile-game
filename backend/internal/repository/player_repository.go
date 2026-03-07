package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// PlayerRepository maneja las operaciones de base de datos para jugadores
type PlayerRepository struct {
	db *sql.DB
}

// NewPlayerRepository crea un nuevo repositorio de jugadores
func NewPlayerRepository(db *sql.DB) *PlayerRepository {
	return &PlayerRepository{db: db}
}

// Create crea un nuevo jugador (legacy - sin event_id, para compatibilidad)
// DEPRECATED: Usar CreateWithEvent para nuevos jugadores
func (r *PlayerRepository) Create(name, avatar string) (*models.Player, error) {
	player := &models.Player{
		ID:        uuid.New(),
		Name:      name,
		Avatar:    avatar,
		Score:     0,
		CreatedAt: time.Now(),
	}

	query := `
		INSERT INTO players (id, name, avatar, score, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.db.Exec(query, player.ID, player.Name, player.Avatar, player.Score, player.CreatedAt)
	if err != nil {
		return nil, err
	}

	return player, nil
}

// GetByID obtiene un jugador por su ID
func (r *PlayerRepository) GetByID(id uuid.UUID) (*models.Player, error) {
	player := &models.Player{}
	query := `
		SELECT id, event_id, name, avatar, score, created_at
		FROM players
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&player.ID, &player.EventID, &player.Name, &player.Avatar, &player.Score, &player.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return player, nil
}

// UpdateScore actualiza el puntaje de un jugador
func (r *PlayerRepository) UpdateScore(id uuid.UUID, score int) error {
	query := `UPDATE players SET score = $1 WHERE id = $2`
	_, err := r.db.Exec(query, score, id)
	return err
}

// List obtiene todos los jugadores ordenados por puntaje
func (r *PlayerRepository) List() ([]models.Player, error) {
	query := `
		SELECT id, event_id, name, avatar, score, created_at
		FROM players
		ORDER BY score DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var player models.Player
		err := rows.Scan(
			&player.ID, &player.EventID, &player.Name, &player.Avatar, &player.Score, &player.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		players = append(players, player)
	}

	return players, nil
}

// CreateWithEvent crea un jugador scopado a un evento
func (r *PlayerRepository) CreateWithEvent(eventID uuid.UUID, name, avatar string) (*models.Player, error) {
	player := &models.Player{
		ID:        uuid.New(),
		EventID:   eventID,
		Name:      name,
		Avatar:    avatar,
		Score:     0,
		CreatedAt: time.Now(),
	}

	query := `
		INSERT INTO players (id, event_id, name, avatar, score, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Exec(query, player.ID, player.EventID, player.Name, player.Avatar, player.Score, player.CreatedAt)
	if err != nil {
		return nil, err
	}

	return player, nil
}

// ListByEvent obtiene todos los jugadores de un evento específico
func (r *PlayerRepository) ListByEvent(eventID uuid.UUID) ([]models.Player, error) {
	query := `
		SELECT id, event_id, name, avatar, score, created_at
		FROM players
		WHERE event_id = $1
		ORDER BY score DESC
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var player models.Player
		err := rows.Scan(
			&player.ID, &player.EventID, &player.Name, &player.Avatar, &player.Score, &player.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		players = append(players, player)
	}

	return players, nil
}
