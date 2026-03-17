package repository

import (
	"database/sql"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

func TestThemeRepository_GetByEventID_Exists(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)

	// Create test event and theme
	eventID := createTestEvent(t, db, "test-event")
	theme := &models.Theme{
		EventID:         eventID,
		PrimaryColor:    "#EC4899",
		SecondaryColor:  "#FBCFE8",
		AccentColor:     "#DB2777",
		BgColor:         "#FFF5F7",
		TextColor:       "#1E293B",
		DisplayFont:     "Great Vibes",
		HeadingFont:     "Playfair Display",
		BodyFont:        "Montserrat",
		BackgroundStyle: "watercolor",
	}

	err := repo.Create(theme)
	require.NoError(t, err)
	require.NotEmpty(t, theme.ID)

	// Execute
	result, err := repo.GetByEventID(eventID)

	// Assert
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, theme.ID, result.ID)
	assert.Equal(t, theme.EventID, result.EventID)
	assert.Equal(t, theme.PrimaryColor, result.PrimaryColor)
	assert.Equal(t, theme.BackgroundStyle, result.BackgroundStyle)
}

func TestThemeRepository_GetByEventID_NotFound(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)

	// Execute - query for non-existent event (valid UUID that doesn't exist)
	result, err := repo.GetByEventID("550e8400-e29b-41d4-a716-446655440000")

	// Assert - should return nil without error (use default)
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestThemeRepository_Create_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)
	eventID := createTestEvent(t, db, "test-event")

	theme := &models.Theme{
		EventID:         eventID,
		PrimaryColor:    "#8B5CF6",
		SecondaryColor:  "#DDD6FE",
		AccentColor:     "#6D28D9",
		BgColor:         "#F5F3FF",
		TextColor:       "#1E293B",
		DisplayFont:     "Playfair Display",
		HeadingFont:     "Cinzel",
		BodyFont:        "Lato",
		BackgroundStyle: "minimal",
	}

	// Execute
	err := repo.Create(theme)

	// Assert
	require.NoError(t, err)
	assert.NotEmpty(t, theme.ID)
	assert.NotZero(t, theme.CreatedAt)
	assert.NotZero(t, theme.UpdatedAt)

	// Verify it can be retrieved
	retrieved, err := repo.GetByEventID(eventID)
	require.NoError(t, err)
	assert.Equal(t, theme.PrimaryColor, retrieved.PrimaryColor)
}

func TestThemeRepository_Update_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)
	eventID := createTestEvent(t, db, "test-event")

	// Create initial theme
	theme := &models.Theme{
		EventID:         eventID,
		PrimaryColor:    "#EC4899",
		SecondaryColor:  "#FBCFE8",
		AccentColor:     "#DB2777",
		BgColor:         "#FFF5F7",
		TextColor:       "#1E293B",
		DisplayFont:     "Great Vibes",
		HeadingFont:     "Playfair Display",
		BodyFont:        "Montserrat",
		BackgroundStyle: "watercolor",
	}
	err := repo.Create(theme)
	require.NoError(t, err)

	// Update theme
	theme.PrimaryColor = "#FF0000"
	theme.AccentColor = "#00FF00"
	theme.DisplayFont = "Custom Font"

	// Execute
	err = repo.Update(theme)

	// Assert
	require.NoError(t, err)
	assert.NotZero(t, theme.UpdatedAt)

	// Verify changes
	retrieved, err := repo.GetByEventID(eventID)
	require.NoError(t, err)
	assert.Equal(t, "#FF0000", retrieved.PrimaryColor)
	assert.Equal(t, "#00FF00", retrieved.AccentColor)
	assert.Equal(t, "Custom Font", retrieved.DisplayFont)
}

func TestThemeRepository_Update_NotFound(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)

	theme := &models.Theme{
		EventID:      "550e8400-e29b-41d4-a716-446655440001",
		PrimaryColor: "#FF0000",
	}

	// Execute
	err := repo.Update(theme)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "theme not found")
}

func TestThemeRepository_Delete_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)
	eventID := createTestEvent(t, db, "test-event")

	// Create theme
	theme := &models.Theme{
		EventID:         eventID,
		PrimaryColor:    "#EC4899",
		SecondaryColor:  "#FBCFE8",
		AccentColor:     "#DB2777",
		BgColor:         "#FFF5F7",
		TextColor:       "#1E293B",
		DisplayFont:     "Great Vibes",
		HeadingFont:     "Playfair Display",
		BodyFont:        "Montserrat",
		BackgroundStyle: "watercolor",
	}
	err := repo.Create(theme)
	require.NoError(t, err)

	// Execute
	err = repo.Delete(eventID)

	// Assert
	require.NoError(t, err)

	// Verify deletion
	retrieved, err := repo.GetByEventID(eventID)
	require.NoError(t, err)
	assert.Nil(t, retrieved)
}

func TestThemeRepository_Delete_NotFound(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewThemeRepository(db)

	// Execute
	err := repo.Delete("550e8400-e29b-41d4-a716-446655440002")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "theme not found")
}

// Helper functions for tests
func createTestEvent(t *testing.T, db *sql.DB, slug string) string {
	// Create a test user first
	user := createTestUser(t, db)

	var id string
	err := db.QueryRow(
		`INSERT INTO events (slug, name, owner_id, features, is_active) 
		 VALUES ($1, $2, $3, '{"quiz": true}'::jsonb, true) 
		 RETURNING id`,
		slug, "Test Event", user.ID,
	).Scan(&id)
	require.NoError(t, err)
	return id
}
