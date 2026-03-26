package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/models"
)

// EventRepository maneja las operaciones de base de datos para eventos
type EventRepository struct {
	db *sql.DB
}

// NewEventRepository crea un nuevo repositorio de eventos
func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

// Create crea un nuevo evento
func (r *EventRepository) Create(ownerID uuid.UUID, slug, name, description string,
	features models.EventFeatures, settings models.EventSettings,
	startsAt, endsAt *time.Time) (*models.Event, error) {

	event := &models.Event{
		ID:          uuid.New(),
		Slug:        slug,
		OwnerID:     ownerID,
		Name:        name,
		Description: description,
		Features:    features,
		Settings:    settings,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		IsActive:    true,
		CreatedAt:   time.Now(),
	}

	// Serializar JSONB
	featuresJSON, _ := json.Marshal(features)
	settingsJSON, _ := json.Marshal(settings)

	query := `
		INSERT INTO events (id, slug, owner_id, name, description, features, settings, starts_at, ends_at, is_active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.Exec(query,
		event.ID, event.Slug, event.OwnerID, event.Name, event.Description,
		featuresJSON, settingsJSON, event.StartsAt, event.EndsAt, event.IsActive, event.CreatedAt)

	if err != nil {
		// Verificar si es error de duplicado (slug único)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrDuplicateSlug
		}
		return nil, err
	}

	return event, nil
}

// GetBySlug obtiene un evento por su slug
func (r *EventRepository) GetBySlug(slug string) (*models.Event, error) {
	event := &models.Event{}
	var featuresJSON, settingsJSON []byte

	query := `
		SELECT id, slug, owner_id, name, description, features, settings, starts_at, ends_at, is_active, created_at
		FROM events
		WHERE slug = $1
	`

	err := r.db.QueryRow(query, slug).Scan(
		&event.ID, &event.Slug, &event.OwnerID, &event.Name, &event.Description,
		&featuresJSON, &settingsJSON, &event.StartsAt, &event.EndsAt, &event.IsActive, &event.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrEventNotFound
		}
		return nil, err
	}

	// Deserializar JSONB
	json.Unmarshal(featuresJSON, &event.Features)
	json.Unmarshal(settingsJSON, &event.Settings)

	return event, nil
}

// GetByID obtiene un evento por su ID
func (r *EventRepository) GetByID(id uuid.UUID) (*models.Event, error) {
	event := &models.Event{}
	var featuresJSON, settingsJSON []byte

	query := `
		SELECT id, slug, owner_id, name, description, features, settings, starts_at, ends_at, is_active, created_at
		FROM events
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&event.ID, &event.Slug, &event.OwnerID, &event.Name, &event.Description,
		&featuresJSON, &settingsJSON, &event.StartsAt, &event.EndsAt, &event.IsActive, &event.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrEventNotFound
		}
		return nil, err
	}

	json.Unmarshal(featuresJSON, &event.Features)
	json.Unmarshal(settingsJSON, &event.Settings)

	return event, nil
}

// ListByOwner obtiene todos los eventos de un usuario
func (r *EventRepository) ListByOwner(ownerID uuid.UUID) ([]models.Event, error) {
	query := `
		SELECT id, slug, owner_id, name, description, features, settings, starts_at, ends_at, is_active, created_at
		FROM events
		WHERE owner_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		var featuresJSON, settingsJSON []byte

		err := rows.Scan(
			&event.ID, &event.Slug, &event.OwnerID, &event.Name, &event.Description,
			&featuresJSON, &settingsJSON, &event.StartsAt, &event.EndsAt, &event.IsActive, &event.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(featuresJSON, &event.Features)
		json.Unmarshal(settingsJSON, &event.Settings)

		events = append(events, event)
	}

	return events, nil
}

// Update actualiza un evento
func (r *EventRepository) Update(event *models.Event) error {
	featuresJSON, _ := json.Marshal(event.Features)
	settingsJSON, _ := json.Marshal(event.Settings)

	query := `
		UPDATE events
		SET name = $1, description = $2, features = $3, settings = $4,
		    starts_at = $5, ends_at = $6, is_active = $7, secret_box_token = $8
		WHERE id = $9
	`

	_, err := r.db.Exec(query,
		event.Name, event.Description, featuresJSON, settingsJSON,
		event.StartsAt, event.EndsAt, event.IsActive, event.SecretBoxToken, event.ID)

	return err
}

// Delete elimina un evento (cascade elimina todo lo relacionado)
func (r *EventRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM events WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// ErrDuplicateSlug error cuando el slug ya existe
var ErrDuplicateSlug = errors.New("event slug already exists")

// ErrEventNotFound error cuando el evento no existe
var ErrEventNotFound = errors.New("event not found")
