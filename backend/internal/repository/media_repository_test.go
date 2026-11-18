package repository

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// The media lookup resolves every stored reference of a path to its event.
func TestMediaRepositoryFindByPath(t *testing.T) {
	db := setupTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	repo := NewMediaRepository(db)
	owner := createTestUser(t, db)
	unique := uuid.NewString()
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM users WHERE id = $1`, owner.ID)
	})

	event, err := NewEventRepository(db).Create(owner.ID, "media-repo-"+uuid.NewString(), "Media Repo Event", "",
		models.EventFeatures{}, models.EventSettings{
			LogoURL:       "/uploads/logos/media-repo-" + unique + ".png",
			BackgroundURL: "/uploads/backgrounds/media-repo-" + unique + ".png",
		}, nil, nil)
	if err != nil {
		t.Fatalf("create test event error = %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM events WHERE id = $1`, event.ID)
	})

	imagePath := "/uploads/postcards/media-repo-" + unique + ".png"
	thumbnailPath := "/uploads/postcards/thumbnails/media-repo-" + unique + ".png"
	heroPath := "/uploads/postcards/media-repo-hero-" + unique + ".png"
	if _, err := db.Exec(`INSERT INTO postcards (id, event_id, image_path, thumbnail_path) VALUES ($1, $2, $3, $4)`,
		uuid.New(), event.ID, imagePath, thumbnailPath); err != nil {
		t.Fatalf("insert test postcard error = %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM postcards WHERE image_path = $1`, imagePath)
	})

	theme := &models.Theme{EventID: event.ID.String(), HeroImagePath: &heroPath}
	if err := NewThemeRepository(db).Create(theme); err != nil {
		t.Fatalf("create test theme error = %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM themes WHERE event_id = $1`, event.ID)
	})

	cases := []struct {
		name     string
		path     string
		expected MediaKind
	}{
		{"postcard image", imagePath, MediaKindPostcardImage},
		{"postcard thumbnail", thumbnailPath, MediaKindPostcardThumbnail},
		{"event logo", "/uploads/logos/media-repo-" + unique + ".png", MediaKindEventLogo},
		{"event background", "/uploads/backgrounds/media-repo-" + unique + ".png", MediaKindEventBackground},
		{"theme hero image", heroPath, MediaKindThemeHeroImage},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			records, err := repo.FindByPath(tc.path)
			if err != nil {
				t.Fatalf("FindByPath(%q) error = %v", tc.path, err)
			}
			if len(records) != 1 {
				t.Fatalf("records = %d, want 1", len(records))
			}
			record := records[0]
			if record.Kind != tc.expected {
				t.Errorf("kind = %q, want %q", record.Kind, tc.expected)
			}
			if record.EventID == nil || *record.EventID != event.ID {
				t.Errorf("event id = %v, want %s", record.EventID, event.ID)
			}
		})
	}
}

// An unknown path is not a stored media record.
func TestMediaRepositoryFindByPathNotFound(t *testing.T) {
	db := setupTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	repo := NewMediaRepository(db)

	records, err := repo.FindByPath("/uploads/postcards/does-not-exist.png")
	if !errors.Is(err, ErrMediaNotFound) {
		t.Fatalf("FindByPath() error = %v, want ErrMediaNotFound", err)
	}
	if records != nil {
		t.Errorf("records = %v, want nil", records)
	}
}

// Media that belongs to no event keeps a null event association.
func TestMediaRepositoryFindByPathEventless(t *testing.T) {
	db := setupTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	repo := NewMediaRepository(db)
	path := "/uploads/postcards/media-repo-eventless-" + uuid.NewString() + ".png"
	if _, err := db.Exec(`INSERT INTO postcards (id, image_path) VALUES ($1, $2)`, uuid.New(), path); err != nil {
		t.Fatalf("insert test postcard error = %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM postcards WHERE image_path = $1`, path)
	})

	records, err := repo.FindByPath(path)
	if err != nil {
		t.Fatalf("FindByPath(%q) error = %v", path, err)
	}
	if len(records) != 1 {
		t.Fatalf("records = %d, want 1", len(records))
	}
	if records[0].EventID != nil {
		t.Errorf("event id = %v, want nil", records[0].EventID)
	}
}

// A path that is referenced by more than one record returns every match, so
// the caller can apply the strictest policy to a shared path.
func TestMediaRepositoryFindByPathReturnsEveryReference(t *testing.T) {
	db := setupTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	repo := NewMediaRepository(db)
	unique := uuid.NewString()
	path := "/uploads/postcards/media-repo-shared-" + unique + ".png"

	owner := createTestUser(t, db)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM users WHERE id = $1`, owner.ID) })

	eventRepo := NewEventRepository(db)
	eventIDs := []uuid.UUID{}
	for i := 0; i < 2; i++ {
		event, err := eventRepo.Create(owner.ID, "media-repo-shared-"+uuid.NewString(), "Media Repo Shared", "",
			models.EventFeatures{}, models.EventSettings{}, nil, nil)
		if err != nil {
			t.Fatalf("create test event error = %v", err)
		}
		eventIDs = append(eventIDs, event.ID)
		if _, err := db.Exec(`INSERT INTO postcards (id, event_id, image_path) VALUES ($1, $2, $3)`, uuid.New(), event.ID, path); err != nil {
			t.Fatalf("insert test postcard error = %v", err)
		}
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM postcards WHERE image_path = $1`, path)
		for _, eventID := range eventIDs {
			_, _ = db.Exec(`DELETE FROM events WHERE id = $1`, eventID)
		}
	})

	records, err := repo.FindByPath(path)
	if err != nil {
		t.Fatalf("FindByPath(%q) error = %v", path, err)
	}
	if len(records) != 2 {
		t.Fatalf("records = %d, want 2", len(records))
	}

	found := map[uuid.UUID]bool{}
	for _, record := range records {
		if record.EventID == nil {
			t.Fatalf("event id = nil, want one of the two events")
		}
		found[*record.EventID] = true
	}
	for _, eventID := range eventIDs {
		if !found[eventID] {
			t.Errorf("events = %v, want both %s and %s", found, eventIDs[0], eventIDs[1])
		}
	}
}
