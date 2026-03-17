package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/the-mile-game/backend/internal/models"
)

// MockThemeService simula el servicio de temas para tests
type MockThemeService struct {
	GetThemeBySlugFunc     func(slug string) (*models.Theme, error)
	GetAllPresetsFunc      func() []models.ThemePreset
	UpdateThemeFunc        func(eventID string, updates map[string]interface{}) (*models.Theme, error)
	ApplyPresetToEventFunc func(eventID string, presetName string) (*models.Theme, error)
}

func (m *MockThemeService) GetThemeBySlug(slug string) (*models.Theme, error) {
	return m.GetThemeBySlugFunc(slug)
}

func (m *MockThemeService) GetAllPresets() []models.ThemePreset {
	return m.GetAllPresetsFunc()
}

func (m *MockThemeService) UpdateTheme(eventID string, updates map[string]interface{}) (*models.Theme, error) {
	return m.UpdateThemeFunc(eventID, updates)
}

func (m *MockThemeService) ApplyPresetToEvent(eventID string, presetName string) (*models.Theme, error) {
	return m.ApplyPresetToEventFunc(eventID, presetName)
}

// ========== TESTS PARA GET THEME ==========

func TestGetTheme_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockTheme := &models.Theme{
		EventID:         "event-123",
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

	mockService := &MockThemeService{
		GetThemeBySlugFunc: func(slug string) (*models.Theme, error) {
			return mockTheme, nil
		},
	}

	handler := NewThemeHandler(mockService)
	r.GET("/api/events/:slug/theme", handler.GetTheme)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/test-event/theme", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.Theme
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "#EC4899", response.PrimaryColor)
	assert.Equal(t, "Great Vibes", response.DisplayFont)
}

func TestGetTheme_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockService := &MockThemeService{
		GetThemeBySlugFunc: func(slug string) (*models.Theme, error) {
			return nil, errors.New("database error")
		},
	}

	handler := NewThemeHandler(mockService)
	r.GET("/api/events/:slug/theme", handler.GetTheme)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/test-event/theme", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

// ========== TESTS PARA GET PRESETS ==========

func TestGetPresets_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockPresets := []models.ThemePreset{
		{Name: "princess", PrimaryColor: "#EC4899"},
		{Name: "dark", PrimaryColor: "#06B6D4"},
		{Name: "elegant", PrimaryColor: "#8B5CF6"},
	}

	mockService := &MockThemeService{
		GetAllPresetsFunc: func() []models.ThemePreset {
			return mockPresets
		},
	}

	handler := NewThemeHandler(mockService)
	r.GET("/api/themes/presets", handler.GetPresets)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/themes/presets", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string][]models.ThemePreset
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response["presets"], 3)
	assert.Equal(t, "princess", response["presets"][0].Name)
}

// ========== TESTS PARA UPDATE THEME ==========

func TestUpdateTheme_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockTheme := &models.Theme{
		EventID:      "event-123",
		PrimaryColor: "#FF0000",
		AccentColor:  "#00FF00",
	}

	mockService := &MockThemeService{
		UpdateThemeFunc: func(eventID string, updates map[string]interface{}) (*models.Theme, error) {
			return mockTheme, nil
		},
	}

	handler := NewThemeHandler(mockService)
	r.PUT("/api/admin/events/:id/theme", handler.UpdateTheme)

	updates := map[string]interface{}{
		"primaryColor": "#FF0000",
		"accentColor":  "#00FF00",
	}

	body, _ := json.Marshal(updates)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/api/admin/events/event-123/theme", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
}

func TestUpdateTheme_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockService := &MockThemeService{}
	handler := NewThemeHandler(mockService)
	r.PUT("/api/admin/events/:id/theme", handler.UpdateTheme)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/api/admin/events/event-123/theme", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateTheme_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockService := &MockThemeService{
		UpdateThemeFunc: func(eventID string, updates map[string]interface{}) (*models.Theme, error) {
			return nil, errors.New("update failed")
		},
	}

	handler := NewThemeHandler(mockService)
	r.PUT("/api/admin/events/:id/theme", handler.UpdateTheme)

	updates := map[string]interface{}{"primaryColor": "#FF0000"}
	body, _ := json.Marshal(updates)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/api/admin/events/event-123/theme", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

// ========== TESTS PARA APPLY PRESET ==========

func TestApplyPreset_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockTheme := &models.Theme{
		EventID:         "event-123",
		PrimaryColor:    "#06B6D4",
		BackgroundStyle: "dark",
	}

	mockService := &MockThemeService{
		ApplyPresetToEventFunc: func(eventID string, presetName string) (*models.Theme, error) {
			return mockTheme, nil
		},
	}

	handler := NewThemeHandler(mockService)
	r.POST("/api/admin/events/:id/theme/preset", handler.ApplyPreset)

	reqBody := map[string]string{"preset": "dark"}
	body, _ := json.Marshal(reqBody)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/admin/events/event-123/theme/preset", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
}

func TestApplyPreset_MissingPreset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockService := &MockThemeService{}
	handler := NewThemeHandler(mockService)
	r.POST("/api/admin/events/:id/theme/preset", handler.ApplyPreset)

	reqBody := map[string]string{} // Missing preset
	body, _ := json.Marshal(reqBody)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/admin/events/event-123/theme/preset", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestApplyPreset_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockService := &MockThemeService{
		ApplyPresetToEventFunc: func(eventID string, presetName string) (*models.Theme, error) {
			return nil, errors.New("apply failed")
		},
	}

	handler := NewThemeHandler(mockService)
	r.POST("/api/admin/events/:id/theme/preset", handler.ApplyPreset)

	reqBody := map[string]string{"preset": "unknown"}
	body, _ := json.Marshal(reqBody)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/admin/events/event-123/theme/preset", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
