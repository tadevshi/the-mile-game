package repository

import (
	"database/sql"
	"fmt"

	"github.com/the-mile-game/backend/internal/models"
)

// ThemeRepository defines the interface for theme data access
type ThemeRepository interface {
	GetByEventID(eventID string) (*models.Theme, error)
	Create(theme *models.Theme) error
	Update(theme *models.Theme) error
	Delete(eventID string) error
}

// themeRepository implements ThemeRepository
type themeRepository struct {
	db *sql.DB
}

// NewThemeRepository creates a new ThemeRepository
func NewThemeRepository(db *sql.DB) ThemeRepository {
	return &themeRepository{db: db}
}

// GetByEventID retrieves a theme by event ID
func (r *themeRepository) GetByEventID(eventID string) (*models.Theme, error) {
	query := `
		SELECT id, event_id, primary_color, secondary_color, accent_color, 
		       bg_color, text_color, display_font, heading_font, body_font,
		       logo_path, hero_image_path, background_style, created_at, updated_at
		FROM themes 
		WHERE event_id = $1
	`

	var theme models.Theme
	err := r.db.QueryRow(query, eventID).Scan(
		&theme.ID, &theme.EventID, &theme.PrimaryColor, &theme.SecondaryColor,
		&theme.AccentColor, &theme.BgColor, &theme.TextColor, &theme.DisplayFont,
		&theme.HeadingFont, &theme.BodyFont, &theme.LogoPath, &theme.HeroImagePath,
		&theme.BackgroundStyle, &theme.CreatedAt, &theme.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No theme found, will use default
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get theme: %w", err)
	}

	return &theme, nil
}

// Create inserts a new theme
func (r *themeRepository) Create(theme *models.Theme) error {
	query := `
		INSERT INTO themes (
			event_id, primary_color, secondary_color, accent_color, 
			bg_color, text_color, display_font, heading_font, body_font,
			logo_path, hero_image_path, background_style
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(
		query, theme.EventID, theme.PrimaryColor, theme.SecondaryColor,
		theme.AccentColor, theme.BgColor, theme.TextColor, theme.DisplayFont,
		theme.HeadingFont, theme.BodyFont, theme.LogoPath, theme.HeroImagePath,
		theme.BackgroundStyle,
	).Scan(&theme.ID, &theme.CreatedAt, &theme.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create theme: %w", err)
	}

	return nil
}

// Update modifies an existing theme
func (r *themeRepository) Update(theme *models.Theme) error {
	query := `
		UPDATE themes 
		SET primary_color = $1, secondary_color = $2, accent_color = $3,
		    bg_color = $4, text_color = $5, display_font = $6, heading_font = $7,
		    body_font = $8, logo_path = $9, hero_image_path = $10,
		    background_style = $11, updated_at = NOW()
		WHERE event_id = $12
		RETURNING updated_at
	`

	err := r.db.QueryRow(
		query, theme.PrimaryColor, theme.SecondaryColor, theme.AccentColor,
		theme.BgColor, theme.TextColor, theme.DisplayFont, theme.HeadingFont,
		theme.BodyFont, theme.LogoPath, theme.HeroImagePath,
		theme.BackgroundStyle, theme.EventID,
	).Scan(&theme.UpdatedAt)

	if err == sql.ErrNoRows {
		return fmt.Errorf("theme not found for event %s", theme.EventID)
	}
	if err != nil {
		return fmt.Errorf("failed to update theme: %w", err)
	}

	return nil
}

// Delete removes a theme by event ID
func (r *themeRepository) Delete(eventID string) error {
	query := `DELETE FROM themes WHERE event_id = $1`

	result, err := r.db.Exec(query, eventID)
	if err != nil {
		return fmt.Errorf("failed to delete theme: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("theme not found for event %s", eventID)
	}

	return nil
}
