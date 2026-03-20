package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// PostcardRepository maneja las operaciones de base de datos para postales
type PostcardRepository struct {
	db         *sql.DB
	uploadPath string
}

// NewPostcardRepository crea un nuevo repositorio de postales
func NewPostcardRepository(db *sql.DB, uploadPath string) *PostcardRepository {
	return &PostcardRepository{db: db, uploadPath: uploadPath}
}

// scanPostcard escanea una fila de postcard con todos los campos nullable manejados.
// La query que alimenta este scanner DEBE seleccionar columnas en este orden:
//
//		p.id, p.event_id, p.player_id, p.sender_name, player_name (computed), player_avatar (computed),
//		p.image_path, p.message, p.rotation, p.is_secret, p.revealed_at, p.created_at,
//	 p.media_type, p.thumbnail_path, p.media_duration_ms
func scanPostcard(row interface {
	Scan(...any) error
}) (*models.Postcard, error) {
	var postcard models.Postcard
	var eventIDStr sql.NullString
	var playerIDStr sql.NullString
	var senderNameStr sql.NullString
	var revealedAt sql.NullTime
	var thumbnailPath sql.NullString
	var mediaDurationMs sql.NullInt64

	err := row.Scan(
		&postcard.ID,
		&eventIDStr,
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
		&postcard.MediaType,
		&thumbnailPath,
		&mediaDurationMs,
	)
	if err != nil {
		return nil, err
	}

	if eventIDStr.Valid {
		id, err := uuid.Parse(eventIDStr.String)
		if err == nil {
			postcard.EventID = id
		}
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
	if thumbnailPath.Valid {
		postcard.ThumbnailPath = &thumbnailPath.String
	}
	if mediaDurationMs.Valid {
		ms := int(mediaDurationMs.Int64)
		postcard.MediaDurationMs = &ms
	}

	return &postcard, nil
}

// publicPostcardCols columnas base para queries públicas (player_name y player_avatar via COALESCE)
const publicPostcardCols = `
	p.id,
	p.event_id::text,
	p.player_id::text,
	p.sender_name,
	COALESCE(p.sender_name, pl.name, 'Invitado') AS player_name,
	CASE WHEN p.is_secret = TRUE THEN '🎁' ELSE COALESCE(pl.avatar, '👤') END AS player_avatar,
	p.image_path, p.message, p.rotation, p.is_secret, p.revealed_at, p.created_at,
	p.media_type, p.thumbnail_path, p.media_duration_ms
FROM postcards p
LEFT JOIN players pl ON p.player_id = pl.id`

// Create crea una nueva postal regular (player_id requerido)
func (r *PostcardRepository) Create(playerID uuid.UUID, imagePath, message string, rotation float64, senderName *string, mediaType string, thumbnailPath *string, mediaDurationMs *int) (*models.Postcard, error) {
	id := uuid.New()
	createdAt := time.Now()

	query := `
		INSERT INTO postcards (id, player_id, image_path, message, rotation, sender_name, is_secret, created_at, media_type, thumbnail_path, media_duration_ms)
		VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(query, id, playerID, imagePath, message, rotation, senderName, createdAt, mediaType, thumbnailPath, mediaDurationMs)
	if err != nil {
		return nil, err
	}

	return r.GetByID(id)
}

// CreateSecret crea una postal secreta (sin player_id, soporta imágenes y videos)
func (r *PostcardRepository) CreateSecret(senderName, imagePath, message string, rotation float64, mediaType string, thumbnailPath *string, mediaDurationMs *int) (*models.Postcard, error) {
	id := uuid.New()
	createdAt := time.Now()

	query := `
		INSERT INTO postcards (id, player_id, image_path, message, rotation, sender_name, is_secret, created_at, media_type, thumbnail_path, media_duration_ms)
		VALUES ($1, NULL, $2, $3, $4, $5, TRUE, $6, $7, $8, $9)
	`

	_, err := r.db.Exec(query, id, imagePath, message, rotation, senderName, createdAt, mediaType, thumbnailPath, mediaDurationMs)
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

// RevealPostcard marca una postal específica como revelada (para auto-reveal post-secret-box)
func (r *PostcardRepository) RevealPostcard(id uuid.UUID) (*models.Postcard, error) {
	_, err := r.db.Exec(`
		UPDATE postcards
		SET revealed_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return nil, err
	}
	return r.GetByID(id)
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

// CreateWithEvent crea una nueva postal scopada a un evento (soporta imágenes y videos)
func (r *PostcardRepository) CreateWithEvent(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string, mediaType string, thumbnailPath *string, mediaDurationMs *int) (*models.Postcard, error) {
	id := uuid.New()
	createdAt := time.Now()

	query := `
		INSERT INTO postcards (id, event_id, player_id, image_path, message, rotation, sender_name, is_secret, created_at, media_type, thumbnail_path, media_duration_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9, $10, $11)
	`

	_, err := r.db.Exec(query, id, eventID, playerID, imagePath, message, rotation, senderName, createdAt, mediaType, thumbnailPath, mediaDurationMs)
	if err != nil {
		return nil, err
	}

	return r.GetByID(id)
}

// ListByEvent obtiene todas las postales PÚBLICAS de un evento específico
func (r *PostcardRepository) ListByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	query := `SELECT` + publicPostcardCols + `
		WHERE p.event_id = $1 AND (p.is_secret = FALSE OR p.revealed_at IS NOT NULL)
		ORDER BY
			CASE WHEN p.is_secret = TRUE AND p.revealed_at IS NOT NULL THEN 0 ELSE 1 END ASC,
			p.created_at DESC`

	rows, err := r.db.Query(query, eventID)
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

// ListSecretByEvent obtiene todas las postales secretas de un evento específico
func (r *PostcardRepository) ListSecretByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	query := `SELECT` + publicPostcardCols + `
		WHERE p.event_id = $1 AND p.is_secret = TRUE
		ORDER BY p.created_at DESC`

	rows, err := r.db.Query(query, eventID)
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

// RevealSecretBoxByEvent marca todas las secretas no reveladas de un evento como reveladas
func (r *PostcardRepository) RevealSecretBoxByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	_, err := r.db.Exec(`
		UPDATE postcards
		SET revealed_at = NOW()
		WHERE event_id = $1 AND is_secret = TRUE AND revealed_at IS NULL
	`, eventID)
	if err != nil {
		return nil, err
	}

	return r.ListSecretByEvent(eventID)
}

// GetSecretBoxStatusByEvent devuelve el estado de la Secret Box para un evento específico
func (r *PostcardRepository) GetSecretBoxStatusByEvent(eventID uuid.UUID) (*models.SecretBoxStatus, error) {
	var status models.SecretBoxStatus
	var revealedAt sql.NullTime

	err := r.db.QueryRow(`
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE revealed_at IS NOT NULL) > 0 AS revealed,
			MAX(revealed_at) AS revealed_at
		FROM postcards
		WHERE event_id = $1 AND is_secret = TRUE
	`, eventID).Scan(&status.Total, &status.Revealed, &revealedAt)
	if err != nil {
		return nil, err
	}

	if revealedAt.Valid {
		status.RevealedAt = &revealedAt.Time
	}

	return &status, nil
}
