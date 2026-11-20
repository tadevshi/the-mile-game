package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/handlers"
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

func TestScopedPageViewRouteUsesEventVisibilityPolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ownerID := uuid.New()
	guestID := uuid.New()
	collaboratorID := uuid.New()
	outsiderID := uuid.New()
	event := &models.Event{ID: uuid.New(), OwnerID: ownerID, IsPublic: true}
	router := gin.New()
	api := router.Group("/api")
	pageViewCalls := 0
	eventLookup := func(c *gin.Context) {
		c.Set("event", event)
		c.Set("event_id", event.ID)
		c.Next()
	}
	optionalAuth := func(c *gin.Context) {
		identities := map[string]uuid.UUID{
			"owner":        ownerID,
			"guest":        guestID,
			"collaborator": collaboratorID,
			"outsider":     outsiderID,
		}
		if userID, ok := identities[c.GetHeader("X-Test-Identity")]; ok {
			c.Set("user_id", userID)
		}
		c.Next()
	}
	collaborators := &routeMembershipChecker{allowed: collaboratorID}
	guests := &routeMembershipChecker{allowed: guestID}
	registerScopedPageViewRoute(api, eventLookup, optionalAuth, middleware.EventVisibilityMiddleware(collaborators, guests), func(c *gin.Context) {
		pageViewCalls++
		c.JSON(http.StatusOK, gin.H{"logged": true})
	})

	tests := []struct {
		name       string
		isPublic   bool
		identity   string
		wantStatus int
		wantBody   string
		wantCalls  int
	}{
		{name: "public anonymous", isPublic: true, wantStatus: http.StatusOK, wantBody: `{"logged":true}`, wantCalls: 1},
		{name: "private anonymous", identity: "", wantStatus: http.StatusUnauthorized, wantBody: `{"error":"Authentication required"}`, wantCalls: 1},
		{name: "private outsider", identity: "outsider", wantStatus: http.StatusForbidden, wantBody: `{"error":"Not authorized to view this event"}`, wantCalls: 1},
		{name: "private owner", identity: "owner", wantStatus: http.StatusOK, wantBody: `{"logged":true}`, wantCalls: 2},
		{name: "private collaborator", identity: "collaborator", wantStatus: http.StatusOK, wantBody: `{"logged":true}`, wantCalls: 3},
		{name: "private accepted guest", identity: "guest", wantStatus: http.StatusOK, wantBody: `{"logged":true}`, wantCalls: 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event.IsPublic = tt.isPublic
			request := httptest.NewRequest(http.MethodPost, "/api/events/test/page-view", nil)
			if tt.identity != "" {
				request.Header.Set("X-Test-Identity", tt.identity)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tt.wantStatus || response.Body.String() != tt.wantBody {
				t.Errorf("response = %d %q, want %d %q", response.Code, response.Body.String(), tt.wantStatus, tt.wantBody)
			}
			if pageViewCalls != tt.wantCalls {
				t.Errorf("analytics handler calls = %d, want %d", pageViewCalls, tt.wantCalls)
			}
		})
	}
}

// routeEventUpdater es un guardado de evento sin efectos: la prueba de
// politica de ruta ejercita la autorizacion, no la persistencia.
type routeEventUpdater struct{}

func (u *routeEventUpdater) Update(event *models.Event) error { return nil }

func (u *routeEventUpdater) UpdateVisibility(eventID uuid.UUID, isPublic bool) error { return nil }

// routeTestToken emite un token de acceso con el mismo secreto que usa el
// AuthMiddleware real.
func routeTestToken(t *testing.T, secret string, userID uuid.UUID) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID.String(),
		"email":   userID.String() + "@example.com",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("SignedString() error = %v", err)
	}
	return signed
}

// La nueva ruta administrativa del evento se construye con el mismo router y
// los mismos middlewares que usa la aplicacion. La matriz de politica:
// sin credencial 401, una cuenta que no es miembro 403, un invitado aceptado
// 403, un colaborador 200 y el owner 200.
func TestAdminEventRoutePolicyMatrix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "admin-route-policy-secret"
	authService := services.NewAuthService(nil, secret)

	ownerID := uuid.New()
	collaboratorID := uuid.New()
	guestID := uuid.New()
	outsiderID := uuid.New()

	event := &models.Event{
		ID:       uuid.New(),
		Slug:     "policy-event",
		Name:     "Policy Event",
		OwnerID:  ownerID,
		IsActive: true,
		IsPublic: true,
	}
	collaborators := &routeMembershipChecker{allowed: collaboratorID}

	router := gin.New()
	api := router.Group("/api")
	eventLookup := func(c *gin.Context) {
		c.Set("event", event)
		c.Set("event_id", event.ID)
		c.Next()
	}
	adminEvents := adminEventRoutesGroup(
		api,
		eventLookup,
		middleware.AuthMiddleware(authService),
		middleware.AdminMiddleware(collaborators),
	)
	updater := &routeEventUpdater{}
	registerAdminEventFeaturesRoutes(adminEvents, handlers.NewAdminEventHandler(updater, updater, ""))

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{name: "without credentials", wantStatus: http.StatusUnauthorized},
		{name: "an account that is not a member of the event", token: routeTestToken(t, secret, outsiderID), wantStatus: http.StatusForbidden},
		{name: "an accepted guest", token: routeTestToken(t, secret, guestID), wantStatus: http.StatusForbidden},
		{name: "a collaborator", token: routeTestToken(t, secret, collaboratorID), wantStatus: http.StatusOK},
		{name: "the owner", token: routeTestToken(t, secret, ownerID), wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/api/admin/events/policy-event", nil)
			if tt.token != "" {
				request.Header.Set("Authorization", "Bearer "+tt.token)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("response = %d %q, want %d", response.Code, response.Body.String(), tt.wantStatus)
			}
			if tt.wantStatus == http.StatusOK {
				if !strings.Contains(response.Body.String(), `"is_public"`) {
					t.Errorf("response body %q must expose the administrative visibility", response.Body.String())
				}
				return
			}
			if !strings.Contains(response.Body.String(), "error") {
				t.Errorf("response body %q must carry an error", response.Body.String())
			}
		})
	}
}
