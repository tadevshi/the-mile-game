package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// CollaboratorRepository maneja operaciones de base de datos para colaboradores de eventos
type CollaboratorRepository struct {
	db *sql.DB
}

// NewCollaboratorRepository crea un nuevo repositorio de colaboradores
func NewCollaboratorRepository(db *sql.DB) *CollaboratorRepository {
	return &CollaboratorRepository{db: db}
}

// Create agrega un colaborador a un evento. Es idempotente: si ya existe, retorna el existente.
func (r *CollaboratorRepository) Create(eventID, userID uuid.UUID) (*models.Collaborator, error) {
	collaborator := &models.Collaborator{
		ID:        uuid.New(),
		EventID:   eventID,
		UserID:    userID,
		CreatedAt: time.Now(),
	}

	query := `
		INSERT INTO event_collaborators (id, event_id, user_id, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (event_id, user_id) DO NOTHING
	`

	_, err := r.db.Exec(query, collaborator.ID, collaborator.EventID, collaborator.UserID, collaborator.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Retornar el colaborador existente o recién creado
	existing, err := r.GetByEventAndUser(eventID, userID)
	if err != nil {
		return collaborator, nil // fallback: retornar el que intentamos crear
	}
	return existing, nil
}

// GetByEventAndUser obtiene un colaborador específico
func (r *CollaboratorRepository) GetByEventAndUser(eventID, userID uuid.UUID) (*models.Collaborator, error) {
	var c models.Collaborator
	query := `SELECT id, event_id, user_id, created_at FROM event_collaborators WHERE event_id = $1 AND user_id = $2`
	err := r.db.QueryRow(query, eventID, userID).Scan(&c.ID, &c.EventID, &c.UserID, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// ListByEvent obtiene todos los colaboradores de un evento con datos de usuario
func (r *CollaboratorRepository) ListByEvent(eventID uuid.UUID) ([]models.Collaborator, error) {
	query := `
		SELECT c.id, c.event_id, c.user_id, c.created_at,
		       u.id, u.email, u.name, u.created_at
		FROM event_collaborators c
		JOIN users u ON c.user_id = u.id
		WHERE c.event_id = $1
		ORDER BY c.created_at DESC
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collaborators []models.Collaborator
	for rows.Next() {
		var c models.Collaborator
		var u models.User
		err := rows.Scan(
			&c.ID, &c.EventID, &c.UserID, &c.CreatedAt,
			&u.ID, &u.Email, &u.Name, &u.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		c.User = &u
		collaborators = append(collaborators, c)
	}

	return collaborators, nil
}

// Delete elimina un colaborador de un evento
func (r *CollaboratorRepository) Delete(eventID, userID uuid.UUID) error {
	query := `DELETE FROM event_collaborators WHERE event_id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, eventID, userID)
	return err
}

// Exists verifica si un usuario es colaborador de un evento
func (r *CollaboratorRepository) Exists(eventID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM event_collaborators WHERE event_id = $1 AND user_id = $2)`
	var exists bool
	err := r.db.QueryRow(query, eventID, userID).Scan(&exists)
	return exists, err
}

// GetEventsByUser obtiene los IDs de eventos donde el usuario es colaborador
func (r *CollaboratorRepository) GetEventsByUser(userID uuid.UUID) ([]uuid.UUID, error) {
	query := `SELECT event_id FROM event_collaborators WHERE user_id = $1`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var eventIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		eventIDs = append(eventIDs, id)
	}

	return eventIDs, nil
}
