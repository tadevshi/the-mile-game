package models

import (
	"time"

	"github.com/google/uuid"
)

// Guest links an authenticated account to an event, without administrative rights.
// It is independent of both event collaborators and anonymous quiz players.
type Guest struct {
	ID        uuid.UUID `json:"id" db:"id"`
	EventID   uuid.UUID `json:"event_id" db:"event_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
