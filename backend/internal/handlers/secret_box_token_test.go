package handlers

import (
	"encoding/json"
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

// setupSecretBoxTokenRouter replica el wiring de producción del endpoint de
// token de Secret Box: eventMiddleware + authMiddleware + AdminMiddleware
// (owner o colaborador con permisos de admin).
func setupSecretBoxTokenRouter(handler *SecretBoxAdminHandler, event *models.Event, collabRepo *mockCollaboratorRepo, userID uuid.UUID, authenticated bool) *gin.Engine {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	adminEvents := r.Group("/api/admin/events/:slug")
	adminEvents.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	adminEvents.Use(func(c *gin.Context) {
		if authenticated {
			c.Set("user_id", userID)
		}
		c.Next()
	})
	adminEvents.Use(middleware.AdminMiddleware(collabRepo))
	adminEvents.GET("/secret-box/token", handler.GetSecretBoxToken)
	adminEvents.POST("/secret-box/token/regenerate", handler.RegenerateSecretBoxToken)

	return r
}

func newSecretBoxEvent() *models.Event {
	secretBoxToken := "existing-secret-box-token"
	return &models.Event{
		ID:             uuid.New(),
		Slug:           "test-event",
		OwnerID:        uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		Name:           "Test Event",
		Features:       models.EventFeatures{Quiz: true, Corkboard: true, SecretBox: true},
		SecretBoxToken: &secretBoxToken,
		IsActive:       true,
	}
}

func TestGetSecretBoxToken_OwnerCanReadExistingToken(t *testing.T) {
	eventRepo := newMockEventRepoForCollaborators()
	event := newSecretBoxEvent()
	eventRepo.AddEvent(event)

	handler := NewSecretBoxAdminHandler(eventRepo)
	collabRepo := newMockCollaboratorRepo()
	r := setupSecretBoxTokenRouter(handler, event, collabRepo, event.OwnerID, true)

	req, _ := http.NewRequest("GET", "/api/admin/events/test-event/secret-box/token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var res struct {
		Token    string `json:"token"`
		ShareURL string `json:"share_url"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &res))
	assert.Equal(t, "existing-secret-box-token", res.Token)
	assert.Contains(t, res.ShareURL, "/e/test-event/secret-box?token=")
}

func TestGetSecretBoxToken_CollaboratorCanReadExistingToken(t *testing.T) {
	eventRepo := newMockEventRepoForCollaborators()
	event := newSecretBoxEvent()
	eventRepo.AddEvent(event)

	handler := NewSecretBoxAdminHandler(eventRepo)
	collabRepo := newMockCollaboratorRepo()
	collaboratorID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	_, err := collabRepo.Create(event.ID, collaboratorID)
	require.NoError(t, err)

	r := setupSecretBoxTokenRouter(handler, event, collabRepo, collaboratorID, true)

	req, _ := http.NewRequest("GET", "/api/admin/events/test-event/secret-box/token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var res struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &res))
	assert.Equal(t, "existing-secret-box-token", res.Token)
}

func TestGetSecretBoxToken_NonCollaboratorIsDenied(t *testing.T) {
	eventRepo := newMockEventRepoForCollaborators()
	event := newSecretBoxEvent()
	eventRepo.AddEvent(event)

	handler := NewSecretBoxAdminHandler(eventRepo)
	collabRepo := newMockCollaboratorRepo()
	outsiderID := uuid.MustParse("00000000-0000-0000-0000-000000000009")

	r := setupSecretBoxTokenRouter(handler, event, collabRepo, outsiderID, true)

	req, _ := http.NewRequest("GET", "/api/admin/events/test-event/secret-box/token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.NotContains(t, w.Body.String(), "existing-secret-box-token")
}

func TestGetSecretBoxToken_AnonymousIsDenied(t *testing.T) {
	eventRepo := newMockEventRepoForCollaborators()
	event := newSecretBoxEvent()
	eventRepo.AddEvent(event)

	handler := NewSecretBoxAdminHandler(eventRepo)
	collabRepo := newMockCollaboratorRepo()

	r := setupSecretBoxTokenRouter(handler, event, collabRepo, uuid.Nil, false)

	req, _ := http.NewRequest("GET", "/api/admin/events/test-event/secret-box/token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.NotContains(t, w.Body.String(), "existing-secret-box-token")
}

func TestRegenerateSecretBoxToken_OwnerGetsNewToken(t *testing.T) {
	eventRepo := newMockEventRepoForCollaborators()
	event := newSecretBoxEvent()
	eventRepo.AddEvent(event)

	handler := NewSecretBoxAdminHandler(eventRepo)
	collabRepo := newMockCollaboratorRepo()
	r := setupSecretBoxTokenRouter(handler, event, collabRepo, event.OwnerID, true)

	req, _ := http.NewRequest("POST", "/api/admin/events/test-event/secret-box/token/regenerate", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var res struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &res))
	assert.NotEmpty(t, res.Token)
	assert.NotEqual(t, "existing-secret-box-token", res.Token)

	// El token persistido queda actualizado
	updated, err := eventRepo.GetBySlug("test-event")
	require.NoError(t, err)
	require.NotNil(t, updated.SecretBoxToken)
	assert.Equal(t, res.Token, *updated.SecretBoxToken)
}
