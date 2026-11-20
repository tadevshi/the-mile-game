package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
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

	handler := NewAdminEventHandler(mockUpdater, "")

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

func TestUpdateEventFeatures_ResponseOmitsSensitiveTokens(t *testing.T) {
	ownerID := uuid.New()
	event := createTestEventForFeatures("private-event", "Private Event", ownerID, models.EventFeatures{})
	inviteToken, secretBoxToken := "invite-token-protected", "secret-box-token-protected"
	event.InviteToken = &inviteToken
	event.SecretBoxToken = &secretBoxToken
	updater := newMockEventUpdater()
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, "")

	r := gin.New()
	r.Use(func(c *gin.Context) {
		copy := *event
		c.Set("event", &copy)
		c.Set("user_id", ownerID)
		c.Next()
	})
	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)
	request := httptest.NewRequest(http.MethodPut, "/api/admin/events/private-event/features", bytes.NewBufferString(`{"features":{"quiz":true}}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	r.ServeHTTP(response, request)

	require.Equal(t, http.StatusOK, response.Code)
	assert.NotContains(t, response.Body.String(), `"invite_token"`)
	assert.NotContains(t, response.Body.String(), `"secret_box_token"`)
	assert.NotContains(t, response.Body.String(), inviteToken)
	assert.NotContains(t, response.Body.String(), secretBoxToken)
	assert.Contains(t, response.Body.String(), `"name":"Private Event"`)
}

func TestUpdateEventFeatures_InvalidKey(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater, "")

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

	handler := NewAdminEventHandler(mockUpdater, "")

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

	// Since event is not in context, should return 404
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateEventFeatures_InvalidJSON(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater, "")

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

// TestUpdateEventFeatures_NonOwnerUser tests handler behavior when user_id doesn't match event owner.
// Note: Authorization ( OwnerMiddleware ) is tested separately in event_handlers_test.go.
// This test verifies the handler doesn't crash when receiving a non-owner user_id.
func TestUpdateEventFeatures_NonOwnerUser(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater, "")

	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Set event but with different user_id
	// The handler doesn't check ownership - that's middleware's job
	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		// Different user ID (not the owner)
		c.Set("user_id", uuid.MustParse("99999999-9999-9999-9999-999999999999"))
		c.Next()
	})

	r.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

	body := `{"features": {"quiz": true}}`

	req, _ := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Handler processes the request successfully (auth is handled by OwnerMiddleware)
	// This test verifies the handler doesn't crash with a non-owner user_id
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

	handler := NewAdminEventHandler(failUpdater, "")

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

func TestUpdateEventFeatures_PostcardStyle(t *testing.T) {
	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")

	tests := []struct {
		name           string
		initialStyle   models.PostcardStyle
		body           string
		expectedStatus int
		expectedStyle  models.PostcardStyle
	}{
		{
			name:           "updates postcard style",
			initialStyle:   models.PostcardStyleClassic,
			body:           `{"features":{"quiz":true},"settings":{"postcard_style":"polaroid"}}`,
			expectedStatus: http.StatusOK,
			expectedStyle:  models.PostcardStylePolaroid,
		},
		{
			name:           "preserves postcard style when omitted",
			initialStyle:   models.PostcardStylePolaroid,
			body:           `{"features":{"corkboard":true}}`,
			expectedStatus: http.StatusOK,
			expectedStyle:  models.PostcardStylePolaroid,
		},
		{
			name:           "rejects invalid postcard style",
			initialStyle:   models.PostcardStyleClassic,
			body:           `{"features":{"quiz":true},"settings":{"postcard_style":"instant"}}`,
			expectedStatus: http.StatusBadRequest,
			expectedStyle:  models.PostcardStyleClassic,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUpdater := newMockEventUpdater()
			event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
			event.Settings.PostcardStyle = tt.initialStyle
			mockUpdater.AddEvent(event)
			handler := NewAdminEventHandler(mockUpdater, "")

			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(func(c *gin.Context) {
				eventCopy := *event
				c.Set("event", &eventCopy)
				c.Set("user_id", ownerID)
				c.Next()
			})
			router.PUT("/api/admin/events/:slug/features", handler.UpdateEventFeatures)

			req, err := http.NewRequest("PUT", "/api/admin/events/test-event/features", bytes.NewBufferString(tt.body))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Equal(t, tt.expectedStyle, mockUpdater.events[event.ID].Settings.PostcardStyle)
		})
	}
}

func TestUploadMedia_ResponseOmitsSensitiveTokens(t *testing.T) {
	ownerID := uuid.New()
	event := createTestEventForFeatures("private-event", "Private Event", ownerID, models.EventFeatures{})
	inviteToken, secretBoxToken := "invite-token-protected", "secret-box-token-protected"
	event.InviteToken = &inviteToken
	event.SecretBoxToken = &secretBoxToken
	updater := newMockEventUpdater()
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, t.TempDir())

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("type", "logo"))
	file, err := writer.CreateFormFile("file", "logo.png")
	require.NoError(t, err)
	_, err = file.Write([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'})
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	r.POST("/api/admin/events/:slug/media", handler.UploadMedia)
	request := httptest.NewRequest(http.MethodPost, "/api/admin/events/private-event/media", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	r.ServeHTTP(response, request)

	require.Equal(t, http.StatusOK, response.Code)
	assert.NotContains(t, response.Body.String(), `"invite_token"`)
	assert.NotContains(t, response.Body.String(), `"secret_box_token"`)
	assert.NotContains(t, response.Body.String(), inviteToken)
	assert.NotContains(t, response.Body.String(), secretBoxToken)
	assert.Contains(t, response.Body.String(), `"name":"Private Event"`)
}

// ============== UploadMedia TESTS ==============

func TestUploadMedia_InvalidType(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater, "/tmp/uploads")

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		c.Next()
	})

	r.POST("/api/admin/events/:slug/media", handler.UploadMedia)

	// Create multipart form without type
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "test.jpg")
	part.Write([]byte("fake image content"))
	writer.Close()

	req, _ := http.NewRequest("POST", "/api/admin/events/test-event/media", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid type")
}

func TestUploadMedia_NoFile(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater, "/tmp/uploads")

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		c.Next()
	})

	r.POST("/api/admin/events/:slug/media", handler.UploadMedia)

	// Create multipart form without file
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("type", "logo")
	writer.Close()

	req, _ := http.NewRequest("POST", "/api/admin/events/test-event/media", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "File required")
}

func TestUploadMedia_EventNotFound(t *testing.T) {
	mockUpdater := newMockEventUpdater()
	// No events added

	handler := NewAdminEventHandler(mockUpdater, "/tmp/uploads")

	gin.SetMode(gin.TestMode)
	r := gin.New()

	// No event middleware - simulating event not found
	r.POST("/api/admin/events/:slug/media", handler.UploadMedia)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("type", "logo")
	writer.Close()

	req, _ := http.NewRequest("POST", "/api/admin/events/nonexistent/media", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ============== DeleteMedia TESTS ==============

func TestDeleteMedia_ResponseOmitsSensitiveTokens(t *testing.T) {
	ownerID := uuid.New()
	event := createTestEventForFeatures("private-event", "Private Event", ownerID, models.EventFeatures{})
	inviteToken, secretBoxToken := "invite-token-protected", "secret-box-token-protected"
	event.InviteToken = &inviteToken
	event.SecretBoxToken = &secretBoxToken
	updater := newMockEventUpdater()
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, t.TempDir())

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	r.DELETE("/api/admin/events/:slug/media", handler.DeleteMedia)
	response := httptest.NewRecorder()
	r.ServeHTTP(response, httptest.NewRequest(http.MethodDelete, "/api/admin/events/private-event/media?type=logo", nil))

	require.Equal(t, http.StatusOK, response.Code)
	assert.NotContains(t, response.Body.String(), `"invite_token"`)
	assert.NotContains(t, response.Body.String(), `"secret_box_token"`)
	assert.NotContains(t, response.Body.String(), inviteToken)
	assert.NotContains(t, response.Body.String(), secretBoxToken)
	assert.Contains(t, response.Body.String(), `"name":"Private Event"`)
}

func TestDeleteMedia_InvalidType(t *testing.T) {
	mockUpdater := newMockEventUpdater()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForFeatures("test-event", "Test Event", ownerID, models.EventFeatures{})
	event.Settings.LogoURL = "/uploads/logos/test.jpg"
	mockUpdater.AddEvent(event)

	handler := NewAdminEventHandler(mockUpdater, "/tmp/uploads")

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		eventCopy := &models.Event{}
		*eventCopy = *event
		c.Set("event", eventCopy)
		c.Next()
	})

	r.DELETE("/api/admin/events/:slug/media", handler.DeleteMedia)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("type", "invalid")
	writer.Close()

	req, _ := http.NewRequest("DELETE", "/api/admin/events/test-event/media", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid type")
}

func TestDeleteMedia_EventNotFound(t *testing.T) {
	mockUpdater := newMockEventUpdater()
	// No events added

	handler := NewAdminEventHandler(mockUpdater, "/tmp/uploads")

	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.DELETE("/api/admin/events/:slug/media", handler.DeleteMedia)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("type", "logo")
	writer.Close()

	req, _ := http.NewRequest("DELETE", "/api/admin/events/nonexistent/media", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ============== VISIBILIDAD ADMINISTRATIVA (MR8a) ==============

// setupAdminVisibilityRouter replica el wiring de producción del grupo
// administrativo de un evento: EventMiddleware (evento en contexto),
// AuthMiddleware (identidad) y AdminMiddleware (owner o colaborador).
//
// El evento que se expone al handler es una copia del almacenado, de modo que
// solo una llamada a Update deja el valor persistido.
func setupAdminVisibilityRouter(
	handler *AdminEventHandler,
	updater *mockEventUpdater,
	eventID uuid.UUID,
	userID *uuid.UUID,
	collaborators map[uuid.UUID]bool,
) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	admin := r.Group("/api/admin/events/:slug")
	admin.Use(func(c *gin.Context) {
		if stored, ok := updater.events[eventID]; ok {
			eventCopy := *stored
			c.Set("event", &eventCopy)
		}
		c.Next()
	})
	admin.Use(func(c *gin.Context) {
		if userID != nil {
			c.Set("user_id", *userID)
		}
		c.Next()
	})
	admin.Use(middleware.AdminMiddleware(&mockGuestAdminCheck{collaborators: collaborators}))
	admin.PUT("/features", handler.UpdateEventFeatures)
	admin.GET("", handler.GetEvent)
	return r
}

// visibilityBody devuelve el cuerpo de la respuesta parseado como mapa.
func visibilityBody(t *testing.T, body *bytes.Buffer) map[string]interface{} {
	t.Helper()
	var parsed map[string]interface{}
	require.NoError(t, json.Unmarshal(body.Bytes(), &parsed))
	return parsed
}

func TestAdminEventVisibility_OwnerWritesAndReadsVisibility(t *testing.T) {
	ownerID := uuid.New()
	updater := newMockEventUpdater()
	event := createTestEventForFeatures("owner-visibility", "Owner Visibility", ownerID, models.EventFeatures{})
	event.IsPublic = true
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, "")

	router := setupAdminVisibilityRouter(handler, updater, event.ID, &ownerID, nil)

	t.Run("owner writes is_public=false and it persists", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPut, "/api/admin/events/owner-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true},"is_public":false}`))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)

		require.Equal(t, http.StatusOK, response.Code)
		body := visibilityBody(t, response.Body)
		value, ok := body["is_public"]
		require.True(t, ok, "the administrative response must expose is_public")
		assert.Equal(t, false, value)
		assert.Equal(t, false, updater.events[event.ID].IsPublic)
	})

	t.Run("the administrative read returns the current value", func(t *testing.T) {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/admin/events/owner-visibility", nil))

		require.Equal(t, http.StatusOK, response.Code)
		body := visibilityBody(t, response.Body)
		value, ok := body["is_public"]
		require.True(t, ok, "the administrative response must expose is_public")
		assert.Equal(t, false, value)
		assert.Equal(t, "Owner Visibility", body["name"])
	})

	t.Run("owner writes is_public=true and it persists", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPut, "/api/admin/events/owner-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true},"is_public":true}`))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)

		require.Equal(t, http.StatusOK, response.Code)
		body := visibilityBody(t, response.Body)
		assert.Equal(t, true, body["is_public"])
		assert.Equal(t, true, updater.events[event.ID].IsPublic)
	})
}

func TestAdminEventVisibility_CollaboratorWritesVisibility(t *testing.T) {
	ownerID := uuid.New()
	collaboratorID := uuid.New()
	updater := newMockEventUpdater()
	event := createTestEventForFeatures("collaborator-visibility", "Collaborator Visibility", ownerID, models.EventFeatures{})
	event.IsPublic = true
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, "")

	router := setupAdminVisibilityRouter(handler, updater, event.ID, &collaboratorID, map[uuid.UUID]bool{collaboratorID: true})

	request := httptest.NewRequest(http.MethodPut, "/api/admin/events/collaborator-visibility/features", bytes.NewBufferString(`{"features":{"corkboard":true},"is_public":false}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	require.Equal(t, http.StatusOK, response.Code)
	body := visibilityBody(t, response.Body)
	value, ok := body["is_public"]
	require.True(t, ok, "the administrative response must expose is_public")
	assert.Equal(t, false, value)
	assert.Equal(t, false, updater.events[event.ID].IsPublic)
}

func TestAdminEventVisibility_GuestIsRefused(t *testing.T) {
	ownerID := uuid.New()
	guestID := uuid.New()
	updater := newMockEventUpdater()
	event := createTestEventForFeatures("guest-visibility", "Guest Visibility", ownerID, models.EventFeatures{})
	event.IsPublic = true
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, "")

	t.Run("without identity the administration answers 401", func(t *testing.T) {
		router := setupAdminVisibilityRouter(handler, updater, event.ID, nil, nil)
		request := httptest.NewRequest(http.MethodPut, "/api/admin/events/guest-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true},"is_public":false}`))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)

		assert.Equal(t, http.StatusUnauthorized, response.Code)
		assert.Equal(t, true, updater.events[event.ID].IsPublic)
	})

	t.Run("an account that is not an administrator answers 403", func(t *testing.T) {
		router := setupAdminVisibilityRouter(handler, updater, event.ID, &guestID, nil)
		request := httptest.NewRequest(http.MethodPut, "/api/admin/events/guest-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true},"is_public":false}`))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)

		assert.Equal(t, http.StatusForbidden, response.Code)
		assert.Equal(t, true, updater.events[event.ID].IsPublic)
	})
}

func TestAdminEventVisibility_InvalidValueIsBadRequest(t *testing.T) {
	ownerID := uuid.New()
	updater := newMockEventUpdater()
	event := createTestEventForFeatures("invalid-visibility", "Invalid Visibility", ownerID, models.EventFeatures{})
	event.IsPublic = false
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, "")

	router := setupAdminVisibilityRouter(handler, updater, event.ID, &ownerID, nil)

	for _, invalid := range []string{`"yes"`, `1`, `null`, `{}`, `[]`} {
		t.Run("rejects "+invalid, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPut, "/api/admin/events/invalid-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true},"is_public":`+invalid+`}`))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			assert.Equal(t, http.StatusBadRequest, response.Code)
			body := visibilityBody(t, response.Body)
			assert.Contains(t, body, "error")
			// La visibilidad almacenada no cambia.
			assert.Equal(t, false, updater.events[event.ID].IsPublic)
		})
	}
}

func TestAdminEventVisibility_OmittedValuePreservesVisibility(t *testing.T) {
	ownerID := uuid.New()
	updater := newMockEventUpdater()
	event := createTestEventForFeatures("omitted-visibility", "Omitted Visibility", ownerID, models.EventFeatures{})
	event.IsPublic = false
	updater.AddEvent(event)
	handler := NewAdminEventHandler(updater, "")

	router := setupAdminVisibilityRouter(handler, updater, event.ID, &ownerID, nil)

	t.Run("the features update keeps the event private", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPut, "/api/admin/events/omitted-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true}}`))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)

		require.Equal(t, http.StatusOK, response.Code)
		assert.Equal(t, false, updater.events[event.ID].IsPublic)
		assert.Equal(t, true, updater.events[event.ID].Features.Quiz)
	})

	t.Run("the settings update keeps the event private", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPut, "/api/admin/events/omitted-visibility/features", bytes.NewBufferString(`{"features":{"quiz":true},"settings":{"postcard_style":"polaroid"}}`))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)

		require.Equal(t, http.StatusOK, response.Code)
		assert.Equal(t, false, updater.events[event.ID].IsPublic)
		assert.Equal(t, models.PostcardStylePolaroid, updater.events[event.ID].Settings.PostcardStyle)
	})
}

// La respuesta publica nunca expone la visibilidad: la allowlist del DTO
// publico es una propiedad de seguridad.
func TestPublicEventResponse_OmitsVisibility(t *testing.T) {
	ownerID := uuid.New()
	event := createTestEventForFeatures("public-visibility", "Public Visibility", ownerID, models.EventFeatures{})
	event.IsPublic = true

	encoded, err := json.Marshal(models.NewPublicEventResponse(event))
	require.NoError(t, err)
	assert.NotContains(t, string(encoded), "is_public")

	// El mismo evento, servido por la ruta publica, tampoco expone la
	// visibilidad.
	router := setupPublicEventRouter(event)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/events/public-visibility", nil))

	require.Equal(t, http.StatusOK, response.Code)
	assert.NotContains(t, response.Body.String(), "is_public")
	assert.Contains(t, response.Body.String(), "Public Visibility")
}
