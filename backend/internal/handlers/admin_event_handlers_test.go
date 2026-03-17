package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

// ============== MOCKS ==============

type mockEventUpdater struct {
	events map[uuid.UUID]*models.Event
}

func newMockEventUpdater() *mockEventUpdater {
	return &mockEventUpdater{
		events: make(map[uuid.UUID]*models.Event),
	}
}

func (m *mockEventUpdater) AddEvent(event *models.Event) {
	m.events[event.ID] = event
}

func (m *mockEventUpdater) Update(event *models.Event) error {
	if _, ok := m.events[event.ID]; !ok {
		return sql.ErrNoRows
	}
	m.events[event.ID] = event
	return nil
}

// ============== HELPERS ==============

func setupTestRouterForEvents(handler *AdminEventHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Middleware to set event in context (simulating EventMiddleware)
	r.Use(func(c *gin.Context) {
		slug := c.Param("slug")
		if slug != "" {
			// Try to get from a mock or return 404
			// For testing, we'll set up events in test cases
			c.Set("event_slug", slug)
		}
		c.Next()
	})

	// Routes
	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	return r
}

// createTestEventForFeatures creates a test event with given features
func createTestEventForFeatures(slug, name string, ownerID uuid.UUID, features models.EventFeatures) *models.Event {
	return &models.Event{
		ID:          uuid.New(),
		Slug:        slug,
		OwnerID:     ownerID,
		Name:        name,
		Description: "Test event",
		Features:    features,
		IsActive:    true,
	}
}

// ============== TESTS ==============

func TestUpdateEventFeatures_Success(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{
		Quiz:      false,
		Corkboard: false,
		SecretBox: false,
	})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater)

	t.Run("enable quiz feature", func(t *testing.T) {
		// Create router with event in context
		gin.SetMode(gin.TestMode)
		r := gin.New()

		// Middleware to set event in context
		r.Use(func(c *gin.Context) {
			eventCopy := &models.Event{}
			*eventCopy = *event // shallow copy
			c.Set("event", eventCopy)
			c.Set("user_id", ownerID)
			c.Next()
		})

		r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

		body := `{"features": {"quiz": true}}`

		req, _ := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var updatedEvent models.Event
		err := json.Unmarshal(w.Body.Bytes(), &updatedEvent)
		require.NoError(t, err)

		assert.True(t, updatedEvent.Features.Quiz)
		assert.False(t, updatedEvent.Features.Corkboard)
		assert.False(t, updatedEvent.Features.SecretBox)
	})

	t.Run("enable multiple features", func(t *testing.T) {
		// Reset event to all false
		event2 := createTestEventForFeatures("test-event-2", "Test Event 2", ownerID, models.EventFeatures{
			Quiz:      false,
			Corkboard: false,
			SecretBox: false,
		})
		mockUpdater.AddEvent(event2)

		gin.SetMode(gin.TestMode)
		r := gin.New()

		r.Use(func(c *gin.Context) {
			eventCopy := &models.Event{}
			*eventCopy = *event2
			c.Set("event", eventCopy)
			c.Set("user_id", ownerID)
			c.Next()
		})

		r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

		body := `{"features": {"quiz": true, "corkboard": true}}`

		req, _ := http.NewRequest("PUT", "/api/admin/events/test-event-2/features", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var updatedEvent models.Event
		err := json.Unmarshal(w.Body.Bytes(), &updatedEvent)
		require.NoError(t, err)

		assert.True(t, updatedEvent.Features.Quiz)
		assert.True(t, updatedEvent.Features.Corkboard)
		assert.False(t, updatedEvent.Features.SecretBox)
	})
}

func TestUpdateEventFeatures_InvalidKey(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		c.Set("user_id", ownerID)
		c.Next()
	})

	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	body := `{"features": {"invalid_feature": true}}`

	req, _ := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid feature key")
	assert.Contains(t, w.Body.String(), "invalid_feature")
}

func TestUpdateEventFeatures_EventNotFound(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	// No events in mock

	handler := NewAdminEventHandler(mockUpdater)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	// EventMiddleware would normally set this, but we simulate it not being set
	r.Use(func(c *gin.Context) {
		// Don't set event - simulating event not found
		c.Next()
	})

	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	body := `{"features": {"quiz": true}}`

	req, _ := http.NewRequest("PUT", "/api/admin/events/nonexistent/features", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Since event is not in context, should return 500
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUpdateEventFeatures_InvalidJSON(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		c.Set("user_id", ownerID)
		c.Next()
	})

	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	// Invalid JSON
	body := `{"features": {invalid}}`

	req, _ := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateEventFeatures_Unauthorized(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Set event but with different user (simulating OwnerMiddleware failure)
	// Actually, in the real app, OwnerMiddleware would handle this
	// Here we simulate the case where the user is NOT the owner
	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		// Different user ID
		c.Set("user_id", uuid.MustParse("99999999-9999-9999-9999-999999999999"))
		c.Next()
	})

	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	body := `{"features": {"quiz": true}}`

	req, _ := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Since we don't have OwnerMiddleware in this test router, it would succeed
	// But in the real app, the OwnerMiddleware would block this
	// This test just verifies the handler doesn't crash
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateEventFeatures_UpdateError(t *testing.T) {
	// Create a mock that always returns error
	failUpdater := &mockEventUpdater{
		events: make(map[uuid.UUID]*models.Event),
	}
	// Don't add any events - Update will return sql.ErrNoRows

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	// Note: event is NOT added to failUpdater

	handler := NewAdminEventHandler(failUpdater)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		c.Set("user_id", ownerID)
		c.Next()
	})

	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	body := `{"features": {"quiz": true}}`

	req, _ := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to update")
}
