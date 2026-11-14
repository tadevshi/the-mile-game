package repository

import (
	"database/sql"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

func setupGuestRepository(t *testing.T) (*sql.DB, *GuestRepository, uuid.UUID, *models.User) {
	t.Helper()

	db := setupTestDB(t)

	owner := createTestUser(t, db)
	event, err := NewEventRepository(db).Create(
		owner.ID,
		"guest-test-"+uuid.NewString(),
		"Guest repository test event",
		"",
		models.EventFeatures{},
		models.EventSettings{},
		nil,
		nil,
	)
	if err != nil {
		t.Fatalf("create test event: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM events WHERE id = $1`, event.ID)
		_, _ = db.Exec(`DELETE FROM users WHERE id = $1`, owner.ID)
		_ = db.Close()
	})

	return db, NewGuestRepository(db), event.ID, owner
}

func createGuestTestUser(t *testing.T, db *sql.DB) *models.User {
	t.Helper()
	user := createTestUser(t, db)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM users WHERE id = $1`, user.ID)
	})
	return user
}

func TestGuestInvitationIsStableAndRotationPreservesMembership(t *testing.T) {
	db, repo, eventID, _ := setupGuestRepository(t)

	invitation, err := repo.GetOrCreateInvitation(eventID)
	if err != nil {
		t.Fatalf("GetOrCreateInvitation() error = %v", err)
	}
	if invitation.Token == "" {
		t.Fatal("GetOrCreateInvitation() returned an empty token")
	}

	again, err := repo.GetOrCreateInvitation(eventID)
	if err != nil {
		t.Fatalf("second GetOrCreateInvitation() error = %v", err)
	}
	if again.Token != invitation.Token {
		t.Fatalf("GetOrCreateInvitation() changed token: first %q, second %q", invitation.Token, again.Token)
	}

	guest := createGuestTestUser(t, db)
	accepted, err := repo.AcceptInvitation(invitation.Token, guest.ID)
	if err != nil {
		t.Fatalf("AcceptInvitation() error = %v", err)
	}
	duplicate, err := repo.AcceptInvitation(invitation.Token, guest.ID)
	if err != nil {
		t.Fatalf("duplicate AcceptInvitation() error = %v", err)
	}
	if accepted.EventID != eventID || duplicate.EventID != eventID || duplicate.UserID != guest.ID {
		t.Fatalf("AcceptInvitation() returned wrong membership: first %+v, second %+v", accepted, duplicate)
	}
	if !accepted.JoinedAt.Equal(duplicate.JoinedAt) {
		t.Fatalf("duplicate acceptance changed membership timestamp: first %v, second %v", accepted.JoinedAt, duplicate.JoinedAt)
	}
	members, err := repo.ListByEvent(eventID)
	if err != nil {
		t.Fatalf("ListByEvent() after duplicate acceptance error = %v", err)
	}
	if len(members) != 1 {
		t.Fatalf("duplicate acceptance created %d membership rows, want 1", len(members))
	}

	rotated, err := repo.RotateInvitation(eventID)
	if err != nil {
		t.Fatalf("RotateInvitation() error = %v", err)
	}
	if rotated.Token == "" || rotated.Token == invitation.Token {
		t.Fatalf("RotateInvitation() did not replace the token")
	}
	member, err := repo.Exists(eventID, guest.ID)
	if err != nil {
		t.Fatalf("Exists() error = %v", err)
	}
	if !member {
		t.Fatal("rotating the invitation removed an existing guest membership")
	}

	lateGuest := createGuestTestUser(t, db)
	if _, err := repo.AcceptInvitation(invitation.Token, lateGuest.ID); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("AcceptInvitation(old token) error = %v, want sql.ErrNoRows", err)
	}
	if _, err := repo.AcceptInvitation(rotated.Token, lateGuest.ID); err != nil {
		t.Fatalf("AcceptInvitation(rotated token) error = %v", err)
	}
}

func TestGuestListAndRemovalAreEventScoped(t *testing.T) {
	db, repo, eventID, _ := setupGuestRepository(t)
	invitation, err := repo.GetOrCreateInvitation(eventID)
	if err != nil {
		t.Fatalf("GetOrCreateInvitation() error = %v", err)
	}
	guest := createGuestTestUser(t, db)
	if _, err := repo.AcceptInvitation(invitation.Token, guest.ID); err != nil {
		t.Fatalf("AcceptInvitation() error = %v", err)
	}

	guests, err := repo.ListByEvent(eventID)
	if err != nil {
		t.Fatalf("ListByEvent() error = %v", err)
	}
	if len(guests) != 1 {
		t.Fatalf("ListByEvent() returned %d guests, want 1", len(guests))
	}
	if guests[0].EventID != eventID || guests[0].UserID != guest.ID || guests[0].User == nil || guests[0].User.Name != guest.Name {
		t.Fatalf("ListByEvent() returned unexpected guest: %+v", guests[0])
	}

	if err := repo.Delete(eventID, guest.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	member, err := repo.Exists(eventID, guest.ID)
	if err != nil {
		t.Fatalf("Exists() error = %v", err)
	}
	if member {
		t.Fatal("Delete() left the guest as a member")
	}
	account, err := NewUserRepository(db).GetByID(guest.ID)
	if err != nil {
		t.Fatalf("Delete() removed the underlying account: GetByID() error = %v", err)
	}
	if account.ID != guest.ID {
		t.Fatalf("Delete() returned account %s, want %s", account.ID, guest.ID)
	}
	guests, err = repo.ListByEvent(eventID)
	if err != nil {
		t.Fatalf("ListByEvent() after Delete() error = %v", err)
	}
	if len(guests) != 0 {
		t.Fatalf("ListByEvent() after Delete() returned %d guests, want 0", len(guests))
	}
}
