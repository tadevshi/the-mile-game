package handlers

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/services"
)

type accessMembership struct {
	allowed         bool
	err             error
	eventID, userID uuid.UUID
}

func (m accessMembership) Exists(eventID, userID uuid.UUID) (bool, error) {
	if eventID != m.eventID || userID != m.userID {
		return false, errors.New("incorrect membership lookup")
	}
	return m.allowed, m.err
}

func TestEventAccessHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	owner, user := uuid.New(), uuid.New()
	routes := []struct{ method, path string }{
		{"GET", ""}, {"GET", "/theme"}, {"POST", "/players"},
		{"GET", "/players"}, {"GET", "/players/player"},
		{"GET", "/quiz/questions"}, {"POST", "/quiz/submit"},
		{"GET", "/quiz/answers/player"}, {"GET", "/ranking"},
		{"GET", "/postcards"}, {"POST", "/postcards"}, {"POST", "/page-view"},
	}
	cases := []struct {
		name, visibility, auth, secret string
		collab, guest                  bool
		collabErr, guestErr            error
		code                           int
		body                           string
	}{
		{name: "public anonymous", visibility: "public", code: 200, body: `{"ok":true}`},
		{name: "zero value public", code: 200, body: `{"ok":true}`},
		{name: "public malformed auth", visibility: "public", auth: "Basic bad", code: 200, body: `{"ok":true}`},
		{name: "public invalid JWT", visibility: "public", auth: "Bearer bad", code: 200, body: `{"ok":true}`},
		{name: "private anonymous", visibility: "private", code: 401, body: `{"error":"Authentication required"}`},
		{name: "secret token is upload only", visibility: "private", secret: "secret", code: 401, body: `{"error":"Authentication required"}`},
		{name: "private invalid JWT", visibility: "private", auth: "Bearer bad", code: 401, body: `{"error":"Authentication required"}`},
		{name: "private unrelated", visibility: "private", auth: "user", code: 403, body: `{"error":"Not authorized to access this event"}`},
		{name: "private owner", visibility: "private", auth: "owner", code: 200, body: `{"ok":true}`},
		{name: "private collaborator", visibility: "private", auth: "user", collab: true, code: 200, body: `{"ok":true}`},
		{name: "private guest", visibility: "private", auth: "user", guest: true, code: 200, body: `{"ok":true}`},
		{name: "collaborator lookup failure", visibility: "private", auth: "user", guest: true, collabErr: errors.New("db"), code: 500, body: `{"error":"Failed to verify permissions"}`},
		{name: "guest lookup failure", visibility: "private", auth: "user", guestErr: errors.New("db"), code: 500, body: `{"error":"Failed to verify permissions"}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			event := &models.Event{ID: uuid.New(), OwnerID: owner, Visibility: tc.visibility}
			collab := accessMembership{tc.collab, tc.collabErr, event.ID, user}
			guest := accessMembership{tc.guest, tc.guestErr, event.ID, user}
			calls := 0
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set("event", event)
				c.Next()
			})
			r.Use(middleware.OptionalAuthMiddleware(services.NewAuthService(nil, "access-test")))
			r.Use(middleware.EventVisibilityMiddleware(collab, guest))
			for _, route := range routes {
				r.Handle(route.method, "/api/events/:slug"+route.path, func(c *gin.Context) {
					calls++
					c.JSON(200, gin.H{"ok": true})
				})
			}
			auth := tc.auth
			if auth == "owner" || auth == "user" {
				id := user
				if auth == "owner" {
					id = owner
				}
				token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": id.String()}).SignedString([]byte("access-test"))
				require.NoError(t, err)
				auth = "Bearer " + token
			}
			for _, route := range routes {
				before := calls
				req := httptest.NewRequest(route.method, "/api/events/test"+route.path, nil)
				req.Header.Set("Authorization", auth)
				req.Header.Set("X-Secret-Token", tc.secret)
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				require.Equal(t, tc.code, w.Code, route.path)
				require.Equal(t, tc.body, w.Body.String(), route.path)
				delta := 0
				if tc.code == 200 {
					delta = 1
				}
				require.Equal(t, before+delta, calls, "rejected requests must not reach downstream writes")
			}
		})
	}
}

func TestPublicEventInfoTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	owner, user := uuid.New(), uuid.New()
	for _, role := range []string{"anonymous", "unrelated", "guest", "owner", "collaborator", "lookup failure"} {
		t.Run(role, func(t *testing.T) {
			secret, invite := "secret", "invite"
			event := &models.Event{ID: uuid.New(), OwnerID: owner, Slug: "test", Name: "Preserved", SecretBoxToken: &secret, InviteToken: &invite, Settings: models.EventSettings{Theme: "pink"}}
			if role == "guest" {
				event.Visibility = models.EventVisibilityPrivate
			}
			collab := accessMembership{allowed: role == "collaborator", eventID: event.ID, userID: user}
			if role == "lookup failure" {
				collab.err = errors.New("db")
			}
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set("event", event)
				if role == "owner" {
					c.Set("user_id", owner)
				} else if role != "anonymous" {
					c.Set("user_id", user)
				}
				c.Next()
			})
			guest := accessMembership{allowed: role == "guest", eventID: event.ID, userID: user}
			r.Use(middleware.EventVisibilityMiddleware(collab, guest))
			r.GET("/api/events/:slug", EventInfoHandler(collab))
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/api/events/test", nil))
			if role == "lookup failure" {
				require.Equal(t, 500, w.Code)
				require.Equal(t, `{"error":"Failed to verify permissions"}`, w.Body.String())
				return
			}
			require.Equal(t, 200, w.Code)
			expected := *event
			privileged := role == "owner" || role == "collaborator"
			if !privileged {
				expected.SecretBoxToken = nil
				expected.InviteToken = nil
			}
			body, err := json.Marshal(expected)
			require.NoError(t, err)
			require.JSONEq(t, string(body), w.Body.String())
			if !privileged {
				require.NotContains(t, w.Body.String(), "secret_box_token")
				require.NotContains(t, w.Body.String(), "invite_token")
			}
			require.Equal(t, &secret, event.SecretBoxToken, "sanitizing must not mutate shared event")
			require.Equal(t, &invite, event.InviteToken)
			if privileged {
				// Dashboard remains owner/collaborator-only and retains raw admin fields.
				dashboard := NewEventHandler(&MockUserEventRepo{Events: []models.Event{*event}}, nil)
				r.GET("/dashboard", dashboard.GetUserEvents)
				w = httptest.NewRecorder()
				r.ServeHTTP(w, httptest.NewRequest("GET", "/dashboard", nil))
				require.Equal(t, 200, w.Code)
				body, err = json.Marshal([]models.Event{*event})
				require.NoError(t, err)
				require.JSONEq(t, string(body), w.Body.String())
			}
		})
	}
}

func TestPublicEventSecretUploadRemainsTokenOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "upload-token"
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", &models.Event{Visibility: models.EventVisibilityPrivate, SecretBoxToken: &secret, Features: models.EventFeatures{SecretBox: true}})
		c.Next()
	})
	h := &Handler{}
	r.POST("/api/events/:slug/secret-box", middleware.SecretBoxFeatureMiddleware(), h.CreateSecretPostcard)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/events/test/secret-box", nil)
	req.Header.Set("X-Secret-Token", secret)
	r.ServeHTTP(w, req)
	// Token passed authentication without login; ordinary upload validation still runs.
	require.Equal(t, 400, w.Code)
	require.Equal(t, `{"error":"sender_name is required for secret postcards"}`, w.Body.String())
}

func TestEventAccessGuestCannotAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	user := uuid.New()
	event := &models.Event{ID: uuid.New(), OwnerID: uuid.New(), Visibility: models.EventVisibilityPrivate}
	collab := accessMembership{eventID: event.ID, userID: user}
	guest := accessMembership{allowed: true, eventID: event.ID, userID: user}
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Set("user_id", user)
		c.Next()
	})
	r.Use(middleware.EventVisibilityMiddleware(collab, guest))
	r.Use(middleware.AdminMiddleware(collab))
	calls := 0
	r.POST("/admin", func(c *gin.Context) {
		calls++
		c.Status(200)
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("POST", "/admin", nil))
	require.Equal(t, 403, w.Code)
	require.Equal(t, `{"error":"Not authorized. You are not the owner or a collaborator of this event"}`, w.Body.String())
	require.Zero(t, calls)
}
