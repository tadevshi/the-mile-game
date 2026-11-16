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

// openPolicyTestDB connects to the disposable PostgreSQL used by the tests.
func openPolicyTestDB(t *testing.T) *sql.DB {
	t.Helper()
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("TEST_DB_HOST"), os.Getenv("TEST_DB_PORT"), os.Getenv("TEST_DB_USER"),
		os.Getenv("TEST_DB_PASSWORD"), os.Getenv("TEST_DB_NAME"))
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM events WHERE slug LIKE 'ws-policy-test-%'`)
		_, _ = db.Exec(`DELETE FROM users WHERE email LIKE 'ws-policy-test-%@example.com'`)
	})
	return db
}

// createPolicyTestUser creates an account that can own an event.
func createPolicyTestUser(t *testing.T, db *sql.DB) uuid.UUID {
	t.Helper()
	id := uuid.New()
	if _, err := db.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
		id, "ws-policy-test-"+id.String()+"@example.com", "hash", "WS Policy Test User"); err != nil {
		t.Fatalf("create test user: %v", err)
	}
	return id
}

// createPolicyTestEvent creates an event with the requested visibility.
func createPolicyTestEvent(t *testing.T, db *sql.DB, repo *repository.EventRepository, ownerID uuid.UUID, isPublic bool) uuid.UUID {
	t.Helper()
	slug := "ws-policy-test-" + uuid.NewString()[:8]
	event, err := repo.Create(ownerID, slug, "Policy test event", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create test event: %v", err)
	}
	if !isPublic {
		if _, err := db.Exec(`UPDATE events SET is_public = FALSE WHERE id = $1`, event.ID); err != nil {
			t.Fatalf("make event private: %v", err)
		}
	}
	return event.ID
}

// The anonymous decision decides what the global broadcasts may carry.
func TestWsRoomPolicyCanAnonymousViewEvent(t *testing.T) {
	db := openPolicyTestDB(t)
	events := repository.NewEventRepository(db)
	policy := NewWsRoomPolicy(events, repository.NewCollaboratorRepository(db), repository.NewGuestRepository(db))

	ownerID := createPolicyTestUser(t, db)
	publicID := createPolicyTestEvent(t, db, events, ownerID, true)
	privateID := createPolicyTestEvent(t, db, events, ownerID, false)
	endedID := createPolicyTestEvent(t, db, events, ownerID, true)
	if _, err := db.Exec(`UPDATE events SET is_active = FALSE WHERE id = $1`, endedID); err != nil {
		t.Fatalf("end test event: %v", err)
	}

	cases := []struct {
		name     string
		eventID  uuid.UUID
		expected bool
	}{
		{"public event", publicID, true},
		{"private event", privateID, false},
		{"ended public event", endedID, false},
		{"eventless data", uuid.Nil, true},
		{"unknown event", uuid.New(), false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			visible, err := policy.CanAnonymousViewEvent(tc.eventID)
			if err != nil {
				t.Fatalf("CanAnonymousViewEvent error = %v", err)
			}
			if visible != tc.expected {
				t.Fatalf("visible = %v, want %v", visible, tc.expected)
			}
		})
	}
}
