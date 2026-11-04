package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/services"
)

type guestFake struct {
	token                  string
	member                 *models.Guest
	event                  *models.Event
	reads, writes, accepts int
}

func (f *guestFake) InviteToken(id uuid.UUID, rotate bool) (string, error) {
	f.reads++
	if rotate || f.token == "" {
		f.token = uuid.NewString()
		f.writes++
	}
	return f.token, nil
}

func (f *guestFake) Accept(token string, user uuid.UUID) (*models.Guest, error) {
	f.accepts++
	if token != f.token || token == "" {
		return nil, sql.ErrNoRows
	}
	if f.member == nil {
		f.member = &models.Guest{ID: uuid.New(), EventID: f.event.ID, UserID: user}
		f.writes++
	}
	return f.member, nil
}

func (f *guestFake) GetByID(id uuid.UUID) (*models.Event, error) {
	return f.event, nil
}

type guestFixture struct {
	router               *gin.Engine
	repo                 *guestFake
	owner, guest, collab string
	guestID              uuid.UUID
	collaborators        *mockCollaboratorRepo
}

func newGuestFixture(t *testing.T) guestFixture {
	t.Helper()
	gin.SetMode(gin.TestMode)
	secret := "guest-test-signing-key"
	owner, guest, collab := uuid.New(), uuid.New(), uuid.New()
	token := func(id uuid.UUID) string {
		s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": id.String(), "exp": time.Now().Add(time.Hour).Unix(),
		}).SignedString([]byte(secret))
		require.NoError(t, err)
		return "Bearer " + s
	}
	collaboratorToken, secretToken := "collaborator-secret", "box-secret"
	f := &guestFake{event: &models.Event{
		ID: uuid.New(), OwnerID: owner, Slug: "party", Name: "Party",
		InviteToken: &collaboratorToken, SecretBoxToken: &secretToken,
	}}
	c := newMockCollaboratorRepo()
	_, err := c.Create(f.event.ID, collab)
	require.NoError(t, err)
	h := NewGuestHandler(f, f)
	r := gin.New()
	auth := middleware.AuthMiddleware(services.NewAuthService(nil, secret))
	r.POST("/api/guests/accept", auth, h.AcceptInvitation)
	group := r.Group("/api/admin/events/:slug", auth, func(ctx *gin.Context) {
		ctx.Set("event", f.event)
		ctx.Next()
	})
	group.GET("/status", middleware.AdminMiddleware(c), func(ctx *gin.Context) {
		ctx.JSON(200, gin.H{"ok": true})
	})
	group.GET("/guests/invite", middleware.OwnerOnlyMiddleware(), h.GetInviteToken)
	group.POST("/guests/invite", middleware.OwnerOnlyMiddleware(), h.GenerateInviteToken)
	return guestFixture{r, f, token(owner), token(guest), token(collab), guest, c}
}

func (f guestFixture) request(method, path, auth string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, req)
	return w
}

func TestGuestRejectedAcceptance(t *testing.T) {
	for _, tc := range []struct {
		name, token   string
		authenticated bool
		status        int
		body          string
		calls         int
	}{
		{"anonymous", "valid", false, 401, `{"error":"Missing authorization header"}`, 0},
		{"missing", "", true, 400, `{"error":"Token is required"}`, 0},
		{"invalid", "invalid", true, 404, `{"error":"Invalid or expired invitation"}`, 1},
		{"collaborator token", "collaborator-secret", true, 404, `{"error":"Invalid or expired invitation"}`, 1},
		{"secret box token", "box-secret", true, 404, `{"error":"Invalid or expired invitation"}`, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := newGuestFixture(t)
			f.repo.token = "valid"
			auth := ""
			if tc.authenticated {
				auth = f.guest
			}
			w := f.request("POST", "/api/guests/accept?token="+tc.token, auth)
			require.Equal(t, tc.status, w.Code)
			require.JSONEq(t, tc.body, w.Body.String())
			require.Zero(t, f.repo.writes)
			require.Zero(t, f.repo.reads)
			require.Equal(t, tc.calls, f.repo.accepts)
			require.Nil(t, f.repo.member)
			require.Equal(t, "valid", f.repo.token)
		})
	}
}

func TestGuestInvitationLifecycle(t *testing.T) {
	t.Setenv("APP_BASE_URL", "https://events.example")
	f := newGuestFixture(t)
	read := func(method string) string {
		w := f.request(method, "/api/admin/events/party/guests/invite", f.owner)
		require.Equal(t, 200, w.Code)
		var response map[string]string
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
		require.Len(t, response, 2)
		require.NoError(t, uuid.Validate(response["token"]))
		require.Equal(t, "https://events.example/guest/join/party?token="+response["token"], response["share_url"])
		return response["token"]
	}
	first := read("GET")
	require.Equal(t, first, read("GET"))
	require.Equal(t, 1, f.repo.writes)
	expected := func() string {
		b, err := json.Marshal(gin.H{
			"message": "Successfully joined event",
			"event": gin.H{"id": f.repo.event.ID, "slug": "party", "name": "Party"},
			"user_id": f.guestID,
		})
		require.NoError(t, err)
		return string(b)
	}
	var previous string
	for i := 0; i < 2; i++ {
		w := f.request("POST", "/api/guests/accept?token="+first, f.guest)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, expected(), w.Body.String())
		if i == 0 {
			previous = w.Body.String()
		} else {
			require.Equal(t, previous, w.Body.String())
		}
	}
	require.Equal(t, 2, f.repo.writes)
	require.Equal(t, f.repo.event.ID, f.repo.member.EventID)
	require.Equal(t, f.guestID, f.repo.member.UserID)
	exists, err := f.collaborators.Exists(f.repo.event.ID, f.repo.member.UserID)
	require.NoError(t, err)
	require.False(t, exists)
	before := f.repo.writes
	w := f.request("GET", "/api/admin/events/party/status", f.guest)
	require.Equal(t, 403, w.Code)
	require.JSONEq(t, `{"error":"Not authorized. You are not the owner or a collaborator of this event"}`, w.Body.String())
	require.Equal(t, before, f.repo.writes)
	w = f.request("GET", "/api/admin/events/party/status", f.collab)
	require.Equal(t, 200, w.Code)
	require.JSONEq(t, `{"ok":true}`, w.Body.String())
	rotated := read("POST")
	require.NotEqual(t, first, rotated)
	before = f.repo.writes
	w = f.request("POST", "/api/guests/accept?token="+first, f.guest)
	require.Equal(t, 404, w.Code)
	require.JSONEq(t, `{"error":"Invalid or expired invitation"}`, w.Body.String())
	require.Equal(t, before, f.repo.writes)
	w = f.request("POST", "/api/guests/accept?token="+rotated, f.guest)
	require.Equal(t, 200, w.Code)
	require.JSONEq(t, expected(), w.Body.String())
	require.Equal(t, before, f.repo.writes)
	require.Equal(t, "collaborator-secret", *f.repo.event.InviteToken)
	require.Equal(t, "box-secret", *f.repo.event.SecretBoxToken)
}

func TestGuestInviteOwnerOnly(t *testing.T) {
	for _, method := range []string{"GET", "POST"} {
		for _, role := range []string{"anonymous", "guest", "collaborator"} {
			t.Run(method+role, func(t *testing.T) {
				f := newGuestFixture(t)
				auth := map[string]string{"guest": f.guest, "collaborator": f.collab}[role]
				status, body := 403, `{"error":"Not authorized. You are not the owner of this event"}`
				if role == "anonymous" {
					status = 401
					body = `{"error":"Missing authorization header"}`
				}
				w := f.request(method, "/api/admin/events/party/guests/invite", auth)
				require.Equal(t, status, w.Code)
				require.JSONEq(t, body, w.Body.String())
				require.Zero(t, f.repo.reads)
				require.Zero(t, f.repo.writes)
				require.Zero(t, f.repo.accepts)
				require.Empty(t, f.repo.token)
				require.Nil(t, f.repo.member)
			})
		}
	}
}
