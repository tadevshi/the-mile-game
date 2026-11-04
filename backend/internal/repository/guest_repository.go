package repository

import (
	"database/sql"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// GuestRepository never reads or writes event_collaborators or players.
// Do not pass it to AdminMiddleware: its Exists method checks guests, not admins.
type GuestRepository struct {
	db *sql.DB
}

func NewGuestRepository(db *sql.DB) *GuestRepository {
	return &GuestRepository{db: db}
}

// InviteToken atomically creates, reads or rotates the shared guest invitation.
// Concurrent first reads converge on the same token; rotation preserves membership.
func (r *GuestRepository) InviteToken(eventID uuid.UUID, regenerate bool) (string, error) {
	var token string
	err := r.db.QueryRow(`
		INSERT INTO event_guest_invites (event_id, token) VALUES ($1, $2)
		ON CONFLICT (event_id) DO UPDATE
		SET token = CASE WHEN $3 THEN EXCLUDED.token ELSE event_guest_invites.token END
		RETURNING token`, eventID, uuid.NewString(), regenerate).Scan(&token)
	return token, err
}

// Accept validates the current token and creates membership in one statement.
// The invitation row lock serializes acceptance with rotation. A rotation that
// finishes first invalidates the old token; one that waits cannot revoke members.
func (r *GuestRepository) Accept(token string, userID uuid.UUID) (*models.Guest, error) {
	var g models.Guest
	err := r.db.QueryRow(`
		WITH invitation AS (
			SELECT event_id FROM event_guest_invites WHERE token = $1 FOR SHARE
		)
		INSERT INTO event_guests (id, event_id, user_id)
		SELECT $2, event_id, $3 FROM invitation WHERE true
		ON CONFLICT (event_id, user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING id, event_id, user_id, created_at`, token, uuid.New(), userID).
		Scan(&g.ID, &g.EventID, &g.UserID, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *GuestRepository) GetByEventAndUser(eventID, userID uuid.UUID) (*models.Guest, error) {
	var g models.Guest
	err := r.db.QueryRow(`SELECT id, event_id, user_id, created_at FROM event_guests WHERE event_id = $1 AND user_id = $2`, eventID, userID).
		Scan(&g.ID, &g.EventID, &g.UserID, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *GuestRepository) Exists(eventID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM event_guests WHERE event_id = $1 AND user_id = $2)`, eventID, userID).Scan(&exists)
	return exists, err
}
