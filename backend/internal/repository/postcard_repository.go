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

// scanPostcard escanea una fila de postcard con todos los campos nullable manejados.
// La query que alimenta este scanner DEBE seleccionar columnas en este orden:
//
//	p.id, p.player_id, p.sender_name, player_name (computed), player_avatar (computed),
//	p.image_path, p.message, p.rotation, p.is_secret, p.revealed_at, p.created_at
func scanPostcard(row interface {
	Scan(...any) error
}) (*models.Postcard, error) {
	var postcard models.Postcard
	var playerIDStr sql.NullString
	var senderNameStr sql.NullString
	var revealedAt sql.NullTime

	err := row.Scan(
		&postcard.ID,
		&playerIDStr,
		&senderNameStr,
		&postcard.PlayerName,
		&postcard.PlayerAvatar,
		&postcard.ImagePath,
		&postcard.Message,
		&postcard.Rotation,
		&postcard.IsSecret,
		&revealedAt,
		&postcard.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if playerIDStr.Valid {
		id, err := uuid.Parse(playerIDStr.String)
		if err == nil {
			postcard.PlayerID = &id
		}
	}
	if senderNameStr.Valid {
		postcard.SenderName = &senderNameStr.String
	}
	if revealedAt.Valid {
		postcard.RevealedAt = &revealedAt.Time
	}

	return &postcard, nil
}

// publicPostcardCols columnas base para queries públicas (player_name y player_avatar via COALESCE)
const publicPostcardCols = `
	p.id,
	p.player_id::text,
	p.sender_name,
	COALESCE(p.sender_name, pl.name, 'Invitado') AS player_name,
	CASE WHEN p.is_secret = TRUE THEN '🎁' ELSE COALESCE(pl.avatar, '👤') END AS player_avatar,
	p.image_path, p.message, p.rotation, p.is_secret, p.revealed_at, p.created_at
FROM postcards p
LEFT JOIN players pl ON p.player_id = pl.id`

// Create crea una nueva postal regular (player_id requerido)
func (r *PostcardRepository) Create(playerID uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error) {
	id := uuid.New()
	createdAt := time.Now()

	query := `
		INSERT INTO postcards (id, player_id, image_path, message, rotation, sender_name, is_secret, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)
	`

	_, err := r.db.Exec(query, id, playerID, imagePath, message, rotation, senderName, createdAt)
	if err != nil {
		return nil, err
	}

	return r.GetByID(id)
}

// CreateSecret crea una postal secreta (sin player_id)
func (r *PostcardRepository) CreateSecret(senderName, imagePath, message string, rotation float64) (*models.Postcard, error) {
	id := uuid.New()
	createdAt := time.Now()

	query := `
		INSERT INTO postcards (id, player_id, image_path, message, rotation, sender_name, is_secret, created_at)
		VALUES ($1, NULL, $2, $3, $4, $5, TRUE, $6)
	`

	_, err := r.db.Exec(query, id, imagePath, message, rotation, senderName, createdAt)
	if err != nil {
		return nil, err
	}

	return r.GetByID(id)
}

// GetByID obtiene una postal por su ID con info del jugador
func (r *PostcardRepository) GetByID(id uuid.UUID) (*models.Postcard, error) {
	query := `SELECT` + publicPostcardCols + `
		WHERE p.id = $1`
	row := r.db.QueryRow(query, id)
	return scanPostcard(row)
}

// List obtiene todas las postales PÚBLICAS: regulares + secretas ya reveladas
func (r *PostcardRepository) List() ([]models.Postcard, error) {
	query := `SELECT` + publicPostcardCols + `
		WHERE p.is_secret = FALSE OR p.revealed_at IS NOT NULL
		ORDER BY
			CASE WHEN p.is_secret = TRUE AND p.revealed_at IS NOT NULL THEN 0 ELSE 1 END ASC,
			p.created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var postcards []models.Postcard
	for rows.Next() {
		postcard, err := scanPostcard(rows)
		if err != nil {
			return nil, err
		}
		postcards = append(postcards, *postcard)
	}

	return postcards, nil
}

// ListSecret devuelve TODAS las postales secretas (para admin, independientemente del reveal)
func (r *PostcardRepository) ListSecret() ([]models.Postcard, error) {
	query := `SELECT` + publicPostcardCols + `
		WHERE p.is_secret = TRUE
		ORDER BY p.created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var postcards []models.Postcard
	for rows.Next() {
		postcard, err := scanPostcard(rows)
		if err != nil {
			return nil, err
		}
		postcards = append(postcards, *postcard)
	}

	return postcards, nil
}

// RevealSecretBox marca todas las secretas no reveladas como reveladas y devuelve las postales.
// Idempotente: si ya fueron reveladas, simplemente devuelve las reveladas.
func (r *PostcardRepository) RevealSecretBox() ([]models.Postcard, error) {
	// UPDATE solo las que aún no tienen revealed_at
	_, err := r.db.Exec(`
		UPDATE postcards
		SET revealed_at = NOW()
		WHERE is_secret = TRUE AND revealed_at IS NULL
	`)
	if err != nil {
		return nil, err
	}

	// Devolver todas las secretas (ya con revealed_at seteado)
	return r.ListSecret()
}

// GetSecretBoxStatus devuelve el estado actual de la Secret Box
func (r *PostcardRepository) GetSecretBoxStatus() (*models.SecretBoxStatus, error) {
	var status models.SecretBoxStatus
	var revealedAt sql.NullTime

	err := r.db.QueryRow(`
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE revealed_at IS NOT NULL) > 0 AS revealed,
			MAX(revealed_at) AS revealed_at
		FROM postcards
		WHERE is_secret = TRUE
	`).Scan(&status.Total, &status.Revealed, &revealedAt)
	if err != nil {
		return nil, err
	}

	if revealedAt.Valid {
		status.RevealedAt = &revealedAt.Time
	}

	return &status, nil
}
