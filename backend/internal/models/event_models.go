package models

import (
	"time"

	"github.com/google/uuid"
)

// User representa un organizador de eventos (reemplaza passphrase auth)
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"` // nunca exponer en JSON
	Name         string    `json:"name" db:"name"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// Event representa un evento (cumpleaños, casamiento, etc.)
type Event struct {
	ID          uuid.UUID     `json:"id" db:"id"`
	Slug        string        `json:"slug" db:"slug"` // URL-friendly: "mile-birthday-2026"
	OwnerID     uuid.UUID     `json:"owner_id" db:"owner_id"`
	Name        string        `json:"name" db:"name"`
	Description string        `json:"description" db:"description"`
	Features    EventFeatures `json:"features" db:"features"` // JSONB
	Settings    EventSettings `json:"settings" db:"settings"` // JSONB
	StartsAt    *time.Time    `json:"starts_at,omitempty" db:"starts_at"`
	EndsAt      *time.Time    `json:"ends_at,omitempty" db:"ends_at"`
	IsActive    bool          `json:"is_active" db:"is_active"`
	CreatedAt   time.Time     `json:"created_at" db:"created_at"`
}

// EventFeatures flags de features habilitadas para el evento
type EventFeatures struct {
	Quiz      bool `json:"quiz"`
	Corkboard bool `json:"corkboard"`
	SecretBox bool `json:"secret_box"`
}

// EventSettings configuración específica del evento
type EventSettings struct {
	Theme           string `json:"theme,omitempty"`
	PrimaryColor    string `json:"primary_color,omitempty"`
	BackgroundImage string `json:"background_image,omitempty"`
}

// QuizQuestion representa una pregunta del quiz configurable por evento
type QuizQuestion struct {
	ID             uuid.UUID `json:"id" db:"id"`
	EventID        uuid.UUID `json:"event_id" db:"event_id"`
	Section        string    `json:"section" db:"section"`                 // 'favorites', 'preferences', 'description'
	Key            string    `json:"key" db:"key"`                         // 'singer', 'flower', 'coffee_or_tea'
	QuestionText   string    `json:"question_text" db:"question_text"`     // "¿Cantante favorito?"
	CorrectAnswers []string  `json:"correct_answers" db:"correct_answers"` // ["Taylor Swift", "taylor"]
	Options        []string  `json:"options,omitempty" db:"options"`       // ["Café", "Té"] para preferences
	SortOrder      int       `json:"sort_order" db:"sort_order"`
	IsScorable     bool      `json:"is_scorable" db:"is_scorable"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// DateOnly es un tipo custom para fechas en formato YYYY-MM-DD
type DateOnly struct {
	time.Time
}

// UnmarshalJSON implementa json.Unmarshaler para DateOnly
func (d *DateOnly) UnmarshalJSON(data []byte) error {
	// Quitar las comillas del string
	str := string(data)
	if str == "null" || str == "" {
		return nil
	}
	str = str[1 : len(str)-1] // quitar comillas

	// Parsear fecha simple
	t, err := time.Parse("2006-01-02", str)
	if err != nil {
		return err
	}
	d.Time = t
	return nil
}

// CreateEventRequest body para crear evento
type CreateEventRequest struct {
	Slug        string        `json:"slug" binding:"required"`
	Name        string        `json:"name" binding:"required"`
	Description string        `json:"description"`
	Features    EventFeatures `json:"features"`
	Settings    EventSettings `json:"settings"`
	StartsAt    *DateOnly     `json:"starts_at,omitempty"`
	EndsAt      *DateOnly     `json:"ends_at,omitempty"`
}

// CreateQuizQuestionRequest body para crear pregunta
type CreateQuizQuestionRequest struct {
	Section        string   `json:"section" binding:"required"`
	Key            string   `json:"key" binding:"required"`
	QuestionText   string   `json:"question_text" binding:"required"`
	CorrectAnswers []string `json:"correct_answers"`
	Options        []string `json:"options,omitempty"`
	SortOrder      int      `json:"sort_order"`
	IsScorable     *bool    `json:"is_scorable"` // nil means default true
}

// UpdateQuizQuestionRequest body para actualizar pregunta
type UpdateQuizQuestionRequest struct {
	Section        *string  `json:"section,omitempty"`
	Key            *string  `json:"key,omitempty"`
	QuestionText   *string  `json:"question_text,omitempty"`
	CorrectAnswers []string `json:"correct_answers,omitempty"`
	Options        []string `json:"options,omitempty"`
	SortOrder      *int     `json:"sort_order,omitempty"`
	IsScorable     *bool    `json:"is_scorable,omitempty"`
}

// ReorderRequest body para reordenar preguntas
type ReorderRequest struct {
	Orders []ReorderItem `json:"orders" binding:"required"`
}

// ReorderItem representa un item en el reorder
type ReorderItem struct {
	ID        string `json:"id" binding:"required"`
	SortOrder int    `json:"sort_order"`
}
