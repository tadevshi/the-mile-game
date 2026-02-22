package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// PostcardRepository maneja las operaciones de base de datos para postales
type PostcardRepository struct {
	db *sql.DB
}

// NewPostcardRepository crea un nuevo repositorio de postales
func NewPostcardRepository(db *sql.DB) *PostcardRepository {
	return &PostcardRepository{db: db}
}

// Create crea una nueva postal
func (r *PostcardRepository) Create(playerID uuid.UUID, imagePath, message string, rotation float64) (*models.Postcard, error) {
	id := uuid.New()
	createdAt := time.Now()

	query := `
		INSERT INTO postcards (id, player_id, image_path, message, rotation, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Exec(query, id, playerID, imagePath, message, rotation, createdAt)
	if err != nil {
		return nil, err
	}

	// Fetch the full postcard with player info via JOIN
	return r.GetByID(id)
}

// GetByID obtiene una postal por su ID con info del jugador
func (r *PostcardRepository) GetByID(id uuid.UUID) (*models.Postcard, error) {
	query := `
		SELECT p.id, p.player_id, pl.name, pl.avatar, p.image_path, p.message, p.rotation, p.created_at
		FROM postcards p
		JOIN players pl ON pl.id = p.player_id
		WHERE p.id = $1
	`

	var postcard models.Postcard
	err := r.db.QueryRow(query, id).Scan(
		&postcard.ID, &postcard.PlayerID, &postcard.PlayerName, &postcard.PlayerAvatar,
		&postcard.ImagePath, &postcard.Message, &postcard.Rotation, &postcard.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &postcard, nil
}

// List obtiene todas las postales ordenadas por fecha de creación (más nuevas primero)
func (r *PostcardRepository) List() ([]models.Postcard, error) {
	query := `
		SELECT p.id, p.player_id, pl.name, pl.avatar, p.image_path, p.message, p.rotation, p.created_at
		FROM postcards p
		JOIN players pl ON pl.id = p.player_id
		ORDER BY p.created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var postcards []models.Postcard
	for rows.Next() {
		var postcard models.Postcard
		err := rows.Scan(
			&postcard.ID, &postcard.PlayerID, &postcard.PlayerName, &postcard.PlayerAvatar,
			&postcard.ImagePath, &postcard.Message, &postcard.Rotation, &postcard.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		postcards = append(postcards, postcard)
	}

	return postcards, nil
}
