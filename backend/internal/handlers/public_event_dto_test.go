package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

// mockCollaboratorEventIDsGetter devuelve los IDs de eventos donde el usuario es colaborador.
type mockCollaboratorEventIDsGetter struct {
	eventIDs []uuid.UUID
}

func (m *mockCollaboratorEventIDsGetter) GetEventsByUser(userID uuid.UUID) ([]uuid.UUID, error) {
	return m.eventIDs, nil
}

// newEventWithSensitiveTokens crea un evento con tokens de invitación y Secret Box.
func newEventWithSensitiveTokens(slug string, ownerID uuid.UUID) models.Event {
	inviteToken := "invite-token-" + slug
	secretBoxToken := "secret-box-token-" + slug
	startsAt := time.Date(2026, 3, 17, 10, 0, 0, 0, time.UTC)
	endsAt := time.Date(2026, 3, 17, 22, 0, 0, 0, time.UTC)
	return models.Event{
		ID:          uuid.New(),
		Slug:        slug,
		OwnerID:     ownerID,
		Name:        "Mile's Birthday 2026",
		Description: "A fun birthday",
		Features:    models.EventFeatures{Quiz: true, Corkboard: true, SecretBox: true},
		Settings: models.EventSettings{
			Theme:         "classic",
			PrimaryColor:  "#EC4899",
			LogoURL:       "logo.png",
			PostcardStyle: models.PostcardStylePolaroid,
		},
		SecretBoxToken: &secretBoxToken,
		InviteToken:    &inviteToken,
		StartsAt:       &startsAt,
		EndsAt:         &endsAt,
		IsActive:       true,
		CreatedAt:      time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC),
	}
}

// setupPublicEventRouter replica el wiring de producción: grupo /events/:slug
// con el evento cargado en el contexto (lo hace EventMiddleware en main.go)
// y la ruta registrada con RegisterPublicEventRoutes.
func setupPublicEventRouter(event *models.Event) *gin.Engine {
	gin.SetMode(gin.TestMode)

	handler := &EventHandler{eventRepo: &MockUserEventRepo{}}

	r := gin.New()
	api := r.Group("/api")
	events := api.Group("/events/:slug")
	events.Use(func(c *gin.Context) {
		if event != nil {
			c.Set("event", event)
			c.Set("event_id", event.ID)
			c.Set("event_slug", event.Slug)
		}
		c.Next()
	})
	RegisterPublicEventRoutes(events, handler)

	return r
}

func TestPublicEventDetail_OmitsSensitiveTokens(t *testing.T) {
	ownerID := uuid.New()
	event := newEventWithSensitiveTokens("mile-2026", ownerID)

	r := setupPublicEventRouter(&event)

	req, _ := http.NewRequest("GET", "/api/events/mile-2026", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	body := w.Body.String()
	assert.NotContains(t, body, "invite_token")
	assert.NotContains(t, body, "secret_box_token")
	assert.NotContains(t, body, "invite-token-mile-2026")
	assert.NotContains(t, body, "secret-box-token-mile-2026")

	var decoded map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &decoded))
	assert.NotContains(t, decoded, "invite_token")
	assert.NotContains(t, decoded, "secret_box_token")
}

func TestPublicEventDetail_PreservesOrdinaryFields(t *testing.T) {
	ownerID := uuid.New()
	event := newEventWithSensitiveTokens("mile-2026", ownerID)

	r := setupPublicEventRouter(&event)

	req, _ := http.NewRequest("GET", "/api/events/mile-2026", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &decoded))

	assert.Equal(t, event.ID.String(), decoded["id"])
	assert.Equal(t, "mile-2026", decoded["slug"])
	assert.Equal(t, ownerID.String(), decoded["owner_id"])
	assert.Equal(t, "Mile's Birthday 2026", decoded["name"])
	assert.Equal(t, "A fun birthday", decoded["description"])
	assert.Equal(t, true, decoded["is_active"])
	assert.Contains(t, decoded, "created_at")
	assert.Contains(t, decoded, "starts_at")
	assert.Contains(t, decoded, "ends_at")

	features, ok := decoded["features"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, true, features["quiz"])
	assert.Equal(t, true, features["corkboard"])
	assert.Equal(t, true, features["secretBox"])

	settings, ok := decoded["settings"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "classic", settings["theme"])
	assert.Equal(t, "#EC4899", settings["primary_color"])
	assert.Equal(t, "polaroid", settings["postcard_style"])
}

func TestPublicEventDetail_EventNotInContextReturns404(t *testing.T) {
	r := setupPublicEventRouter(nil)

	req, _ := http.NewRequest("GET", "/api/events/mile-2026", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ========== LISTADO AUTENTICADO ==========

func setupUserEventsRouter(repo EventRepo, collabRepo CollaboratorEventIDsGetter, userID uuid.UUID) *gin.Engine {
	gin.SetMode(gin.TestMode)

	handler := NewEventHandler(repo, collabRepo)

	r := gin.New()
	users := r.Group("/api/users")
	users.Use(func(c *gin.Context) {
		if userID != uuid.Nil {
			c.Set("user_id", userID)
		}
		c.Next()
	})
	users.GET("/me/events", handler.GetUserEvents)

	return r
}

func TestGetUserEvents_OmitsSensitiveTokensForOwnedEvents(t *testing.T) {
	userID := uuid.New()
	owned := newEventWithSensitiveTokens("owned-event", userID)

	repo := &MockUserEventRepo{Events: []models.Event{owned}}
	r := setupUserEventsRouter(repo, &mockCollaboratorEventIDsGetter{}, userID)

	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	body := w.Body.String()
	assert.NotContains(t, body, "invite_token")
	assert.NotContains(t, body, "secret_box_token")
	assert.NotContains(t, body, "invite-token-owned-event")
	assert.NotContains(t, body, "secret-box-token-owned-event")
}

func TestGetUserEvents_OmitsSensitiveTokensForCollaboratorEvents(t *testing.T) {
	userID := uuid.New()
	ownerID := uuid.New()
	shared := newEventWithSensitiveTokens("shared-event", ownerID)

	repo := &MockUserEventRepo{Events: []models.Event{shared}}
	collabRepo := &mockCollaboratorEventIDsGetter{eventIDs: []uuid.UUID{shared.ID}}
	r := setupUserEventsRouter(repo, collabRepo, userID)

	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	body := w.Body.String()
	assert.NotContains(t, body, "invite_token")
	assert.NotContains(t, body, "secret_box_token")
	assert.NotContains(t, body, "invite-token-shared-event")
	assert.NotContains(t, body, "secret-box-token-shared-event")

	var decoded []map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &decoded))
	require.Len(t, decoded, 1)
	assert.Equal(t, "shared-event", decoded[0]["slug"])
	assert.Equal(t, ownerID.String(), decoded[0]["owner_id"])
}

func TestGetUserEvents_PreservesOrdinaryFields(t *testing.T) {
	userID := uuid.New()
	owned := newEventWithSensitiveTokens("owned-event", userID)

	repo := &MockUserEventRepo{Events: []models.Event{owned}}
	r := setupUserEventsRouter(repo, &mockCollaboratorEventIDsGetter{}, userID)

	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var decoded []map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &decoded))
	require.Len(t, decoded, 1)

	assert.Equal(t, owned.ID.String(), decoded[0]["id"])
	assert.Equal(t, "owned-event", decoded[0]["slug"])
	assert.Equal(t, userID.String(), decoded[0]["owner_id"])
	assert.Equal(t, "Mile's Birthday 2026", decoded[0]["name"])
	assert.Equal(t, "A fun birthday", decoded[0]["description"])
	assert.Contains(t, decoded[0], "created_at")
	assert.Contains(t, decoded[0], "features")
	assert.Contains(t, decoded[0], "settings")
}

func TestGetUserEvents_EmptyListReturnsEmptyArray(t *testing.T) {
	userID := uuid.New()

	repo := &MockUserEventRepo{Events: []models.Event{}}
	r := setupUserEventsRouter(repo, &mockCollaboratorEventIDsGetter{}, userID)

	req, _ := http.NewRequest("GET", "/api/users/me/events", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())
}
