package services

import (
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// ThemeService handles theme business logic
type ThemeService struct {
	themeRepo repository.ThemeRepository
	eventRepo repository.EventRepository
}

// NewThemeService creates a new ThemeService
func NewThemeService(themeRepo repository.ThemeRepository, eventRepo repository.EventRepository) *ThemeService {
	return &ThemeService{
		themeRepo: themeRepo,
		eventRepo: eventRepo,
	}
}

// GetThemeForEvent retrieves the theme for an event, creating a default if none exists
func (s *ThemeService) GetThemeForEvent(eventID string) (*models.Theme, error) {
	// Try to get existing theme
	theme, err := s.themeRepo.GetByEventID(eventID)
	if err != nil {
		return nil, err
	}

	// If no theme exists, return a default princess preset (not saved yet)
	if theme == nil {
		preset, _ := models.GetPresetByName("princess")
		theme = models.ApplyPreset(preset, eventID)
	}

	return theme, nil
}

// GetThemeBySlug retrieves theme by event slug
func (s *ThemeService) GetThemeBySlug(slug string) (*models.Theme, error) {
	// Get event by slug
	event, err := s.eventRepo.GetBySlug(slug)
	if err != nil {
		return nil, err
	}

	return s.GetThemeForEvent(event.ID.String())
}

// ApplyPresetToEvent applies a preset theme to an event
func (s *ThemeService) ApplyPresetToEvent(eventID string, presetName string) (*models.Theme, error) {
	// Get preset
	preset, found := models.GetPresetByName(presetName)
	if !found {
		// Fall back to princess if preset not found
		preset, _ = models.GetPresetByName("princess")
	}

	// Create theme from preset
	theme := models.ApplyPreset(preset, eventID)

	// Check if theme already exists
	existing, err := s.themeRepo.GetByEventID(eventID)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		// Update existing theme
		theme.ID = existing.ID
		theme.LogoPath = existing.LogoPath
		theme.HeroImagePath = existing.HeroImagePath
		err = s.themeRepo.Update(theme)
	} else {
		// Create new theme
		err = s.themeRepo.Create(theme)
	}

	if err != nil {
		return nil, err
	}

	return theme, nil
}

// UpdateTheme updates specific theme fields
func (s *ThemeService) UpdateTheme(eventID string, updates map[string]interface{}) (*models.Theme, error) {
	// Get existing theme or create from preset
	theme, err := s.themeRepo.GetByEventID(eventID)
	if err != nil {
		return nil, err
	}

	if theme == nil {
		// Create new theme from princess preset
		preset, _ := models.GetPresetByName("princess")
		theme = models.ApplyPreset(preset, eventID)
		err = s.themeRepo.Create(theme)
		if err != nil {
			return nil, err
		}
	}

	// Apply updates
	if primaryColor, ok := updates["primaryColor"].(string); ok {
		theme.PrimaryColor = primaryColor
	}
	if secondaryColor, ok := updates["secondaryColor"].(string); ok {
		theme.SecondaryColor = secondaryColor
	}
	if accentColor, ok := updates["accentColor"].(string); ok {
		theme.AccentColor = accentColor
	}
	if bgColor, ok := updates["bgColor"].(string); ok {
		theme.BgColor = bgColor
	}
	if textColor, ok := updates["textColor"].(string); ok {
		theme.TextColor = textColor
	}
	if displayFont, ok := updates["displayFont"].(string); ok {
		theme.DisplayFont = displayFont
	}
	if headingFont, ok := updates["headingFont"].(string); ok {
		theme.HeadingFont = headingFont
	}
	if bodyFont, ok := updates["bodyFont"].(string); ok {
		theme.BodyFont = bodyFont
	}
	if backgroundStyle, ok := updates["backgroundStyle"].(string); ok {
		theme.BackgroundStyle = backgroundStyle
	}

	// Save updates
	err = s.themeRepo.Update(theme)
	if err != nil {
		return nil, err
	}

	return theme, nil
}

// GetAllPresets returns all available theme presets
func (s *ThemeService) GetAllPresets() []models.ThemePreset {
	return models.ThemePresets
}
