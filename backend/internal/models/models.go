package models

import (
	"time"

	"github.com/google/uuid"
)

// Player representa un jugador registrado
type Player struct {
	ID        uuid.UUID `json:"id" db:"id"`
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
