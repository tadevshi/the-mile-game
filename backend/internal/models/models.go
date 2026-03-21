package models

import (
	"time"

	"github.com/google/uuid"
)

// Player representa un jugador registrado
type Player struct {
	ID        uuid.UUID `json:"id" db:"id"`
	EventID   uuid.UUID `json:"event_id" db:"event_id"` // FK a events
	Name      string    `json:"name" db:"name"`
	Avatar    string    `json:"avatar" db:"avatar"`
	Score     int       `json:"score" db:"score"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// QuizAnswers representa las respuestas de un jugador
type QuizAnswers struct {
	ID          uuid.UUID         `json:"id" db:"id"`
	PlayerID    uuid.UUID         `json:"player_id" db:"player_id"`
	Favorites   map[string]string `json:"favorites" db:"favorites"`
	Preferences map[string]string `json:"preferences" db:"preferences"`
	Description string            `json:"description" db:"description"`
	CreatedAt   time.Time         `json:"created_at" db:"created_at"`
}

// RankingEntry representa una entrada en el ranking
type RankingEntry struct {
	Position int    `json:"position"`
	Player   Player `json:"player"`
}

// CreatePlayerRequest representa el body de creación de jugador
type CreatePlayerRequest struct {
	Name   string `json:"name" binding:"required"`
	Avatar string `json:"avatar"`
}

// SubmitQuizRequest representa el body de envío de respuestas
type SubmitQuizRequest struct {
	Favorites   map[string]string `json:"favorites" binding:"required"`
	Preferences map[string]string `json:"preferences" binding:"required"`
	Description string            `json:"description"`
}

// Postcard representa una postal en la cartelera de corcho
type Postcard struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	EventID      uuid.UUID  `json:"event_id" db:"event_id"`                 // FK a events
	PlayerID     *uuid.UUID `json:"player_id,omitempty" db:"player_id"`     // nullable para secretas
	SenderName   *string    `json:"sender_name,omitempty" db:"sender_name"` // sobreescribe player name
	PlayerName   string     `json:"player_name" db:"player_name"`           // computado via JOIN/COALESCE
	PlayerAvatar string     `json:"player_avatar" db:"player_avatar"`       // computado via JOIN/COALESCE
	ImagePath    string     `json:"image_path" db:"image_path"`
	Message      string     `json:"message" db:"message"`
	Rotation     float64    `json:"rotation" db:"rotation"`
	IsSecret     bool       `json:"is_secret" db:"is_secret"`
	RevealedAt   *time.Time `json:"revealed_at,omitempty" db:"revealed_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	// Video postcard fields
	MediaType       string  `json:"media_type" db:"media_type"`                   // "image" | "video"
	ThumbnailPath   *string `json:"thumbnail_path,omitempty" db:"thumbnail_path"` // para videos
	MediaDurationMs *int    `json:"media_duration_ms,omitempty" db:"media_duration_ms"`
}

// CreatePostcardResponse respuesta al crear una postal
type CreatePostcardResponse struct {
	ID        uuid.UUID `json:"id"`
	ImagePath string    `json:"image_path"`
	Rotation  float64   `json:"rotation"`
	Message   string    `json:"message"`
}

// SecretBoxStatus estado de la Secret Box para el panel admin
type SecretBoxStatus struct {
	Total      int        `json:"total"`
	Revealed   bool       `json:"revealed"`
	RevealedAt *time.Time `json:"revealed_at,omitempty"`
}
