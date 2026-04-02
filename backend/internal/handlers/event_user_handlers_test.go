package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// MockUserEventRepo is a mock implementation of EventRepo for testing
type MockUserEventRepo struct {
	Events []models.Event
	Err    error
}

func (m *MockUserEventRepo) ListByOwner(ownerID uuid.UUID) ([]models.Event, error) {
	if m.Err != nil {
		return nil, m.Err
	}
	return m.Events, nil
}

func (m *MockUserEventRepo) Create(ownerID uuid.UUID, slug, name, description string,
	features models.EventFeatures, settings models.EventSettings,
	startsAt, endsAt *time.Time) (*models.Event, error) {
	if m.Err != nil {
		return nil, m.Err
	}
	event := &models.Event{
		ID:          uuid.New(),
		Slug:        slug,
		OwnerID:     ownerID,
		Name:        name,
		Description: description,
		Features:    features,
		Settings:    settings,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		IsActive:    true,
		CreatedAt:   time.Now(),
	}
	m.Events = append(m.Events, *event)
	return event, nil
}

func (m *MockUserEventRepo) Delete(id uuid.UUID) error {
	if m.Err != nil {
		return m.Err
	}
	for i, e := range m.Events {
		if e.ID == id {
			m.Events = append(m.Events[:i], m.Events[i+1:]...)
			return nil
		}
	}
	return nil
}

// ========== TESTS FOR GetUserEvents ==========

func TestGetUserEvents_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userID := uuid.New()
	ownerID := uuid.New()

	// Create mock events
	events := []models.Event{
		{
			ID:          uuid.New(),
			Slug:        "event-1",
			OwnerID:     ownerID,
			Name:        "Test Event 1",
			Description: "Description 1",
			IsActive:    true,
			CreatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Slug:        "event-2",
			OwnerID:     ownerID,
			Name:        "Test Event 2",
			Description: "Description 2",
			IsActive:    true,
			CreatedAt:   time.Now(),
		},
	}

	mockRepo := &MockUserEventRepo{Events: events}
	handler := &EventHandler{eventRepo: mockRepo}

	r := gin.New()
	r.GET("/api/users/me/events", func(c *gin.Context) {
		// Simulate AuthMiddleware setting user_id
		c.Set("user_id", userID)
		handler.GetUserEvents(c)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []models.Event
	json.Unmarshal(w.Body.Bytes(), &response)

	if len(response) != 2 {
		t.Errorf("Expected 2 events, got %d", len(response))
	}
}

func TestGetUserEvents_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := &MockUserEventRepo{}
	handler := &EventHandler{eventRepo: mockRepo}

	r := gin.New()
	r.GET("/api/users/me/events", handler.GetUserEvents)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetUserEvents_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userID := uuid.New()

	mockRepo := &MockUserEventRepo{Events: []models.Event{}}
	handler := &EventHandler{eventRepo: mockRepo}

	r := gin.New()
	r.GET("/api/users/me/events", func(c *gin.Context) {
		c.Set("user_id", userID)
		handler.GetUserEvents(c)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []models.Event
	json.Unmarshal(w.Body.Bytes(), &response)

	// Should return empty array, not null
	if response == nil {
		t.Error("Expected empty array, got null")
	}

	if len(response) != 0 {
		t.Errorf("Expected 0 events, got %d", len(response))
	}
}

func TestGetUserEvents_Error(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userID := uuid.New()

	mockRepo := &MockUserEventRepo{Err: errors.New("database error")}
	handler := &EventHandler{eventRepo: mockRepo}

	r := gin.New()
	r.GET("/api/users/me/events", func(c *gin.Context) {
		c.Set("user_id", userID)
		handler.GetUserEvents(c)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

// ========== TESTS FOR DeleteEvent ==========

func TestDeleteEvent_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	eventID := uuid.New()
	events := []models.Event{
		{ID: eventID, Slug: "test-event", Name: "Test", IsActive: true, CreatedAt: time.Now()},
	}

	mockRepo := &MockUserEventRepo{Events: events}
	handler := &EventHandler{eventRepo: mockRepo}

	r := gin.New()
	r.DELETE("/api/admin/events/:slug", func(c *gin.Context) {
		c.Set("event", &events[0])
		handler.DeleteEvent(c)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/events/test-event", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if len(mockRepo.Events) != 0 {
		t.Errorf("Expected 0 events after delete, got %d", len(mockRepo.Events))
	}
}

func TestDeleteEvent_Error(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := &MockUserEventRepo{Err: errors.New("database error")}
	handler := &EventHandler{eventRepo: mockRepo}

	r := gin.New()
	r.DELETE("/api/admin/events/:slug", func(c *gin.Context) {
		c.Set("event", &models.Event{ID: uuid.New(), Slug: "test-event"})
		handler.DeleteEvent(c)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/events/test-event", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}
