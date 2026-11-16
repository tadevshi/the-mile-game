package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/services"
)

type routeMembershipChecker struct {
	allowed uuid.UUID
	calls   int
}

func (m *routeMembershipChecker) Exists(_, userID uuid.UUID) (bool, error) {
	m.calls++
	return m.allowed != uuid.Nil && m.allowed == userID, nil
}

func TestOptionalAuthAndVisibilityInteraction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authService := services.NewAuthService(nil, "test-secret")
	tests := []struct {
		name       string
		isPublic   bool
		authHeader string
		wantStatus int
		wantBody   string
	}{
		{name: "public without token", isPublic: true, wantStatus: http.StatusOK, wantBody: "content"},
		{name: "public with malformed optional auth", isPublic: true, authHeader: "invalid", wantStatus: http.StatusOK, wantBody: "content"},
		{name: "public with invalid bearer token", isPublic: true, authHeader: "Bearer not-a-jwt", wantStatus: http.StatusOK, wantBody: "content"},
		{name: "private without token", wantStatus: http.StatusUnauthorized, wantBody: `{"error":"Authentication required"}`},
		{name: "private with malformed optional auth", authHeader: "invalid", wantStatus: http.StatusUnauthorized, wantBody: `{"error":"Authentication required"}`},
		{name: "private with invalid bearer token", authHeader: "Bearer not-a-jwt", wantStatus: http.StatusUnauthorized, wantBody: `{"error":"Authentication required"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &models.Event{ID: uuid.New(), OwnerID: uuid.New(), IsPublic: tt.isPublic}
			router := gin.New()
			api := router.Group("/api")
			eventLookup := func(c *gin.Context) {
				c.Set("event", event)
				c.Set("event_id", event.ID)
				c.Next()
			}
			collaborators := &routeMembershipChecker{}
			guests := &routeMembershipChecker{}
			events := scopedEventContentGroup(api, eventLookup, middleware.OptionalAuthMiddleware(authService), middleware.EventVisibilityMiddleware(collaborators, guests))
			events.GET("/probe", func(c *gin.Context) { c.String(http.StatusOK, "content") })

			request := httptest.NewRequest(http.MethodGet, "/api/events/test/probe", nil)
			if tt.authHeader != "" {
				request.Header.Set("Authorization", tt.authHeader)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tt.wantStatus || response.Body.String() != tt.wantBody {
				t.Errorf("response = %d %q, want %d %q", response.Code, response.Body.String(), tt.wantStatus, tt.wantBody)
			}
			if collaborators.calls != 0 || guests.calls != 0 {
				t.Errorf("unexpected membership lookups: collaborators=%d guests=%d", collaborators.calls, guests.calls)
			}
		})
	}
}

func TestScopedEventContentAndSecretBoxRoutesUseSeparatePolicies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	event := &models.Event{
		ID:       uuid.New(),
		OwnerID:  uuid.New(),
		IsPublic: false,
		Features: models.EventFeatures{SecretBox: true},
	}
	guestID := uuid.New()
	outsiderID := uuid.New()
	collaborators := &routeMembershipChecker{}
	guests := &routeMembershipChecker{allowed: guestID}

	router := gin.New()
	api := router.Group("/api")
	eventLookup := func(c *gin.Context) {
		c.Set("event", event)
		c.Set("event_id", event.ID)
		c.Next()
	}
	optionalAuth := func(c *gin.Context) {
		switch c.GetHeader("X-Test-Identity") {
		case "guest":
			c.Set("user_id", guestID)
		case "outsider":
			c.Set("user_id", outsiderID)
		}
		c.Next()
	}

	events := scopedEventContentGroup(api, eventLookup, optionalAuth, middleware.EventVisibilityMiddleware(collaborators, guests))
	events.GET("/probe", func(c *gin.Context) { c.String(http.StatusOK, "content") })
	registerSecretBoxUploadRoute(api, eventLookup, func(c *gin.Context) { c.Status(http.StatusAccepted) })

	request := httptest.NewRequest(http.MethodGet, "/api/events/private/probe", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized || response.Body.String() != `{"error":"Authentication required"}` {
		t.Errorf("anonymous private content response = %d %q, want 401 with authentication error", response.Code, response.Body.String())
	}

	event.IsPublic = true
	request = httptest.NewRequest(http.MethodGet, "/api/events/public/probe", nil)
	request.Header.Set("X-Test-Identity", "malformed")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Body.String() != "content" {
		t.Errorf("public content with malformed optional identity response = %d %q, want 200 content", response.Code, response.Body.String())
	}
	event.IsPublic = false

	request = httptest.NewRequest(http.MethodGet, "/api/events/private/probe", nil)
	request.Header.Set("X-Test-Identity", "guest")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Body.String() != "content" {
		t.Errorf("accepted guest content response = %d %q, want 200 content", response.Code, response.Body.String())
	}

	request = httptest.NewRequest(http.MethodGet, "/api/events/private/probe", nil)
	request.Header.Set("X-Test-Identity", "outsider")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden || response.Body.String() != `{"error":"Not authorized to view this event"}` {
		t.Errorf("non-member content response = %d %q, want 403 with generic denial", response.Code, response.Body.String())
	}

	request = httptest.NewRequest(http.MethodPost, "/api/events/private/secret-box", nil)
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusAccepted {
		t.Errorf("private Secret Box upload route response = %d, want upload handler status 202", response.Code)
	}
	if guests.calls != 2 || collaborators.calls != 2 {
		t.Errorf("Secret Box upload unexpectedly ran content membership checks: collaborators=%d guests=%d; want 2 each", collaborators.calls, guests.calls)
	}
}
