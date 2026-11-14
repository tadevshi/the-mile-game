package repository

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// GuestRepository manages account-linked guests and event-specific guest invitations.
// Guests are intentionally stored separately from administrative collaborators.
type GuestRepository struct {
	db *sql.DB
}

// NewGuestRepository creates a guest repository.
func NewGuestRepository(db *sql.DB) *GuestRepository {
	return &GuestRepository{db: db}
}

// GetOrCreateInvitation returns the event's current guest invitation, creating one if needed.
func (r *GuestRepository) GetOrCreateInvitation(eventID uuid.UUID) (*models.GuestInvitation, error) {
	token, err := newGuestInvitationToken()
	if err != nil {
		return nil, err
	}

	_, err = r.db.Exec(`
		INSERT INTO event_guest_invitations (event_id, token)
		VALUES ($1, $2)
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, token)
	if err != nil {
		return nil, err
	}

	return r.getInvitationByEvent(eventID)
}

// RotateInvitation replaces the current token. Existing guest memberships are unaffected.
func (r *GuestRepository) RotateInvitation(eventID uuid.UUID) (*models.GuestInvitation, error) {
	token, err := newGuestInvitationToken()
	if err != nil {
		return nil, err
	}

	var invitation models.GuestInvitation
	err = r.db.QueryRow(`
		INSERT INTO event_guest_invitations (event_id, token)
		VALUES ($1, $2)
		ON CONFLICT (event_id) DO UPDATE
		SET token = EXCLUDED.token, updated_at = CURRENT_TIMESTAMP
		RETURNING event_id, token, created_at, updated_at
	`, eventID, token).Scan(
		&invitation.EventID, &invitation.Token, &invitation.CreatedAt, &invitation.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

// AcceptInvitation adds a user to the event represented by the current invitation.
// Repeated acceptance is idempotent. The invitation row lock serializes acceptance
// against token rotation so a token rotated before acceptance cannot create membership.
func (r *GuestRepository) AcceptInvitation(token string, userID uuid.UUID) (*models.EventGuest, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var eventID uuid.UUID
	err = tx.QueryRow(`
		SELECT event_id
		FROM event_guest_invitations
		WHERE token = $1
		FOR SHARE
	`, token).Scan(&eventID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(`
		INSERT INTO event_guests (event_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT (event_id, user_id) DO NOTHING
	`, eventID, userID)
	if err != nil {
		return nil, err
	}

	var guest models.EventGuest
	err = tx.QueryRow(`
		SELECT event_id, user_id, joined_at
		FROM event_guests
		WHERE event_id = $1 AND user_id = $2
	`, eventID, userID).Scan(&guest.EventID, &guest.UserID, &guest.JoinedAt)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &guest, nil
}

// ListByEvent returns the event's guest memberships with displayable account details.
func (r *GuestRepository) ListByEvent(eventID uuid.UUID) ([]models.EventGuest, error) {
	rows, err := r.db.Query(`
		SELECT g.event_id, g.user_id, g.joined_at,
		       u.id, u.email, u.name, u.created_at
		FROM event_guests g
		JOIN users u ON u.id = g.user_id
		WHERE g.event_id = $1
		ORDER BY g.joined_at DESC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	guests := make([]models.EventGuest, 0)
	for rows.Next() {
		var guest models.EventGuest
		var user models.User
		if err := rows.Scan(
			&guest.EventID, &guest.UserID, &guest.JoinedAt,
			&user.ID, &user.Email, &user.Name, &user.CreatedAt,
		); err != nil {
			return nil, err
		}
		guest.User = &user
		guests = append(guests, guest)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return guests, nil
}

// Delete removes one account's guest membership without affecting its account or the invitation.
func (r *GuestRepository) Delete(eventID, userID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM event_guests WHERE event_id = $1 AND user_id = $2`, eventID, userID)
	return err
}

// Exists reports whether the account has a guest membership for the event.
func (r *GuestRepository) Exists(eventID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM event_guests WHERE event_id = $1 AND user_id = $2
		)
	`, eventID, userID).Scan(&exists)
	return exists, err
}

func (r *GuestRepository) getInvitationByEvent(eventID uuid.UUID) (*models.GuestInvitation, error) {
	var invitation models.GuestInvitation
	err := r.db.QueryRow(`
		SELECT event_id, token, created_at, updated_at
		FROM event_guest_invitations
		WHERE event_id = $1
	`, eventID).Scan(
		&invitation.EventID, &invitation.Token, &invitation.CreatedAt, &invitation.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

func newGuestInvitationToken() (string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(randomBytes), nil
}
