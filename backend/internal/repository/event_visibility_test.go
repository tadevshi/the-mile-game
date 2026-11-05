package repository

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

// Use the serialized public model so these tests also run before the field exists.
func setVisibility(t *testing.T, event *models.Event, value string) {
	t.Helper()
	data, err := json.Marshal(map[string]string{"visibility": value})
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, event))
}

func assertVisibility(t *testing.T, event *models.Event, want string) {
	t.Helper()
	data, err := json.Marshal(event)
	require.NoError(t, err)
	var fields map[string]any
	require.NoError(t, json.Unmarshal(data, &fields))
	require.Equal(t, want, fields["visibility"])
}

func TestEventVisibilityPersistence(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live PostgreSQL integration test in short mode")
	}
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)
	repo := NewEventRepository(db)
	owner := createTestUser(t, db)
	other := createTestUser(t, db)
	start := time.Date(2026, 5, 1, 10, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	event, err := repo.Create(owner.ID, "visibility-event", "Original", "Description",
		models.EventFeatures{Quiz: true, Corkboard: true, SecretBox: true},
		models.EventSettings{Theme: "rose", PrimaryColor: "#abcdef"}, &start, &end)
	require.NoError(t, err)
	t.Run("creation defaults public", func(t *testing.T) {
		assertVisibility(t, event, "public")
	})
	event, err = repo.GetByID(event.ID)
	require.NoError(t, err)
	token := uuid.NewString()
	event.InviteToken = &token
	require.NoError(t, repo.Update(event))

	checkReads := func(t *testing.T, want string) {
		t.Helper()
		reads := map[string]func() (*models.Event, error){
			"slug": func() (*models.Event, error) { return repo.GetBySlug(event.Slug) },
			"id": func() (*models.Event, error) { return repo.GetByID(event.ID) },
			"invite token": func() (*models.Event, error) { return repo.GetByInviteToken(token) },
		}
		for name, read := range reads {
			t.Run(name, func(t *testing.T) {
				got, err := read()
				require.NoError(t, err)
				assertVisibility(t, got, want)
				require.Equal(t, event, got)
			})
		}
		lists := map[string]func() ([]models.Event, error){
			"owner": func() ([]models.Event, error) { return repo.ListByOwner(owner.ID) },
			"accessible owner": func() ([]models.Event, error) { return repo.ListAccessibleByUser(owner.ID, nil) },
			"accessible collaborator": func() ([]models.Event, error) {
				return repo.ListAccessibleByUser(other.ID, []uuid.UUID{event.ID})
			},
		}
		for name, list := range lists {
			t.Run(name, func(t *testing.T) {
				got, err := list()
				require.NoError(t, err)
				require.Len(t, got, 1)
				assertVisibility(t, &got[0], want)
				require.Equal(t, *event, got[0])
			})
		}
	}
	t.Run("default roundtrips", func(t *testing.T) { checkReads(t, "public") })
	setVisibility(t, event, "private")
	require.NoError(t, repo.Update(event))
	t.Run("private roundtrips", func(t *testing.T) { checkReads(t, "private") })

	// Existing callers may build Event without the additive field.
	omitted := *event
	setVisibility(t, &omitted, "")
	omitted.Name = "Renamed"
	require.NoError(t, repo.Update(&omitted))
	event.Name = omitted.Name
	t.Run("omitted update preserves private", func(t *testing.T) { checkReads(t, "private") })

	for _, invalid := range []string{"friends", "PUBLIC", " private "} {
		t.Run("reject "+invalid, func(t *testing.T) {
			candidate := *event
			setVisibility(t, &candidate, invalid)
			candidate.Name = "Must not persist"
			candidate.Settings.Theme = "Must not persist"
			candidate.InviteToken = nil
			require.Error(t, repo.Update(&candidate))
			checkReads(t, "private")
		})
	}
	setVisibility(t, event, "public")
	require.NoError(t, repo.Update(event))
	t.Run("explicit public update", func(t *testing.T) { checkReads(t, "public") })
	setVisibility(t, event, "")
	require.NoError(t, repo.Update(event))
	event, err = repo.GetByID(event.ID)
	require.NoError(t, err)
	t.Run("omitted update preserves public", func(t *testing.T) { checkReads(t, "public") })
}
