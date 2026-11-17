package services

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// openMediaPolicyTestDB connects to the disposable PostgreSQL used by the tests.
func openMediaPolicyTestDB(t *testing.T) *sql.DB {
	t.Helper()
	env := func(key, fallback string) string {
		if value := os.Getenv(key); value != "" {
			return value
		}
		return fallback
	}
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		env("TEST_DB_HOST", "localhost"), env("TEST_DB_PORT", "5432"), env("TEST_DB_USER", "user"),
		env("TEST_DB_PASSWORD", "password"), env("TEST_DB_NAME", "milegame_test"))
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// The media policy mirrors the event visibility rules of the scoped HTTP route.
func TestMediaPolicyDecide(t *testing.T) {
	db := openMediaPolicyTestDB(t)
	events := repository.NewEventRepository(db)
	collaborators := repository.NewCollaboratorRepository(db)
	guests := repository.NewGuestRepository(db)
	policy := NewMediaPolicy(events, collaborators, guests)

	ownerID := uuid.New()
	if _, err := db.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
		ownerID, "media-policy-"+ownerID.String()+"@example.com", "hash", "Media Policy Owner"); err != nil {
		t.Fatalf("create test user: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM users WHERE id = $1`, ownerID) })

	collaboratorID := uuid.New()
	if _, err := db.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
		collaboratorID, "media-policy-"+collaboratorID.String()+"@example.com", "hash", "Media Policy Collaborator"); err != nil {
		t.Fatalf("create test user: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM users WHERE id = $1`, collaboratorID) })

	guestID := uuid.New()
	if _, err := db.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
		guestID, "media-policy-"+guestID.String()+"@example.com", "hash", "Media Policy Guest"); err != nil {
		t.Fatalf("create test user: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM users WHERE id = $1`, guestID) })

	createEvent := func(slug string, isPublic bool, isActive bool) uuid.UUID {
		t.Helper()
		event, err := events.Create(ownerID, slug+"-"+uuid.NewString()[:8], "Media policy event", "",
			models.EventFeatures{}, models.EventSettings{}, nil, nil)
		if err != nil {
			t.Fatalf("create test event: %v", err)
		}
		if !isPublic {
			if _, err := db.Exec(`UPDATE events SET is_public = FALSE WHERE id = $1`, event.ID); err != nil {
				t.Fatalf("make event private: %v", err)
			}
		}
		if !isActive {
			if _, err := db.Exec(`UPDATE events SET is_active = FALSE WHERE id = $1`, event.ID); err != nil {
				t.Fatalf("end test event: %v", err)
			}
		}
		t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM events WHERE id = $1`, event.ID) })
		return event.ID
	}

	publicID := createEvent("media-policy-public", true, true)
	privateID := createEvent("media-policy-private", false, true)
	endedID := createEvent("media-policy-ended", true, false)
	privateEndedID := createEvent("media-policy-private-ended", false, false)

	if _, err := collaborators.Create(privateID, collaboratorID); err != nil {
		t.Fatalf("create collaborator: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO event_guests (event_id, user_id) VALUES ($1, $2)`, privateID, guestID); err != nil {
		t.Fatalf("insert guest: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM event_guests WHERE event_id = $1`, privateID) })

	record := func(eventID *uuid.UUID) *repository.MediaRecord {
		return &repository.MediaRecord{Path: "/uploads/postcards/policy.png", EventID: eventID}
	}

	cases := []struct {
		name      string
		record    *repository.MediaRecord
		userID    uuid.UUID
		decision  MediaDecision
		cacheRule string
	}{
		{"eventless media", record(nil), uuid.Nil, MediaAllowed, MediaCachePublic},
		{"public event", record(&publicID), uuid.Nil, MediaAllowed, MediaCachePublic},
		{"ended event", record(&endedID), uuid.Nil, MediaGone, ""},
		{"private event without identity", record(&privateID), uuid.Nil, MediaUnauthorized, ""},
		{"private event owner", record(&privateID), ownerID, MediaAllowed, MediaCachePrivate},
		{"private event collaborator", record(&privateID), collaboratorID, MediaAllowed, MediaCachePrivate},
		{"private event guest", record(&privateID), guestID, MediaAllowed, MediaCachePrivate},
		{"private event unrelated account", record(&privateID), uuid.New(), MediaForbidden, ""},
		{"ended private event", record(&privateEndedID), ownerID, MediaGone, ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			decision, cacheControl := policy.Decide(tc.record, tc.userID)
			if decision != tc.decision {
				t.Fatalf("decision = %v, want %v", decision, tc.decision)
			}
			if cacheControl != tc.cacheRule {
				t.Fatalf("cache control = %q, want %q", cacheControl, tc.cacheRule)
			}
		})
	}
}
