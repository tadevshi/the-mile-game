package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/the-mile-game/backend/internal/models"
)

// ThemeServiceInterface defines the interface for theme service operations
type ThemeServiceInterface interface {
	GetThemeBySlug(slug string) (*models.Theme, error)
	GetAllPresets() []models.ThemePreset
	UpdateTheme(eventID string, updates map[string]interface{}) (*models.Theme, error)
	ApplyPresetToEvent(eventID string, presetName string) (*models.Theme, error)
}

// ThemeHandler handles theme-related HTTP requests
type ThemeHandler struct {
	themeService ThemeServiceInterface
}

// NewThemeHandler creates a new ThemeHandler
func NewThemeHandler(themeService ThemeServiceInterface) *ThemeHandler {
	return &ThemeHandler{themeService: themeService}
}

// GetTheme returns the theme for an event by slug
// GET /api/events/:slug/theme
func (h *ThemeHandler) GetTheme(c *gin.Context) {
	slug := c.Param("slug")

	theme, err := h.themeService.GetThemeBySlug(slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get theme"})
		return
	}

	c.JSON(http.StatusOK, theme)
}

// GetPresets returns all available theme presets
// GET /api/themes/presets
func (h *ThemeHandler) GetPresets(c *gin.Context) {
	presets := h.themeService.GetAllPresets()
	c.JSON(http.StatusOK, gin.H{"presets": presets})
}

// UpdateTheme updates the theme for an event (admin only)
// PUT /api/admin/events/:id/theme
func (h *ThemeHandler) UpdateTheme(c *gin.Context) {
	eventID := c.Param("id")

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	theme, err := h.themeService.UpdateTheme(eventID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update theme"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"theme":   theme,
	})
}

// ApplyPreset applies a preset theme to an event (admin only)
// POST /api/admin/events/:id/theme/preset
func (h *ThemeHandler) ApplyPreset(c *gin.Context) {
	eventID := c.Param("id")

	var req struct {
		Preset string `json:"preset" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Preset name required"})
		return
	}

	theme, err := h.themeService.ApplyPresetToEvent(eventID, req.Preset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply preset"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"theme":   theme,
	})
}
