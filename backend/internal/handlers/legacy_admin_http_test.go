package handlers

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/services"
)

type legacyAdminRepo struct {
	mockPostcardRepo
	viewer               uuid.UUID
	allowed              bool
	gateErr, contentErr  error
	gates, reads, writes int
	cards                []models.Postcard
	scoped               int
}

func (r *legacyAdminRepo) HasAdministrativeEvents(id uuid.UUID) (bool, error) {
	r.gates++
	if id != r.viewer {
		return false, errors.New("wrong viewer")
	}
	return r.allowed, r.gateErr
}
func (r *legacyAdminRepo) ListSecretForAdmin(id uuid.UUID) ([]models.Postcard, error) {
	r.reads++
	if id != r.viewer {
		return nil, errors.New("wrong viewer")
	}
	return r.cards, r.contentErr
}
func (r *legacyAdminRepo) GetSecretBoxStatusForAdmin(id uuid.UUID) (*models.SecretBoxStatus, error) {
	_, err := r.ListSecretForAdmin(id)
	return &models.SecretBoxStatus{}, err
}
func (r *legacyAdminRepo) RevealSecretBoxForAdmin(id uuid.UUID) ([]models.Postcard, error) {
	r.writes++
	return r.ListSecretForAdmin(id)
}

func (r *legacyAdminRepo) ListSecretByEvent(uuid.UUID) ([]models.Postcard, error) {
	r.scoped++
	return nil, nil
}
func (r *legacyAdminRepo) GetSecretBoxStatusByEvent(uuid.UUID) (*models.SecretBoxStatus, error) {
	r.scoped++
	return &models.SecretBoxStatus{Total: 1}, nil
}
func (r *legacyAdminRepo) RevealSecretBoxByEvent(uuid.UUID) ([]models.Postcard, error) {
	r.scoped++
	return nil, nil
}

func TestLegacyAdminHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	source, err := os.ReadFile("../../cmd/api/main.go")
	require.NoError(t, err)
	for _, route := range []struct{ method, path, handler, body, failure string }{
		{"GET", "/admin/status", "GetSecretBoxStatus", `{"total":0,"revealed":false}`, "Failed to get secret box status"},
		{"GET", "/admin/secret-box", "ListSecretPostcards", `{"postcards":[],"revealed":false,"total":0}`, "Failed to list secret postcards"},
		{"POST", "/admin/reveal", "RevealSecretBox", `{"message":"Secret Box revealed","postcards":[]}`, "Failed to reveal secret box"},
	} {
		t.Run(route.path, func(t *testing.T) {
			// Match the actual legacy registration, not a test-only authentication policy.
			registration := `api.` + route.method + `("` + route.path + `", authMiddleware, handler.` + route.handler + `)`
			require.True(t, strings.Contains(string(source), registration), "missing mandatory auth: %s", registration)
		})
		for _, tc := range []struct {
			name, auth                                           string
			allowed, fault, contentFault, missing, typed, scoped bool
			code                                                 int
			body                                                 string
		}{
			{name: "absent JWT", code: 401, body: `{"error":"Missing authorization header"}`},
			{name: "malformed JWT", auth: "Bearer broken", code: 401, body: `{"error":"Invalid or expired token"}`},
			{name: "guest only", auth: "valid", code: 403, body: `{"error":"Not authorized to administer events"}`},
			{name: "unrelated", auth: "valid", code: 403, body: `{"error":"Not authorized to administer events"}`},
			{name: "role lookup failure", auth: "valid", fault: true, code: 500, body: `{"error":"Failed to verify permissions"}`},
			{name: "missing dependency", auth: "valid", missing: true, code: 500, body: `{"error":"Failed to verify permissions"}`},
			{name: "typed nil dependency", auth: "valid", typed: true, code: 500, body: `{"error":"Failed to verify permissions"}`},
			{name: "owner empty", auth: "valid", allowed: true, code: 200, body: route.body},
			{name: "query failure", auth: "valid", allowed: true, contentFault: true, code: 500, body: `{"error":"` + route.failure + `"}`},
			{name: "scoped unchanged", auth: "valid", scoped: true, code: 200, body: map[bool]string{true: `{"total":1,"revealed":false}`, false: route.body}[route.handler == "GetSecretBoxStatus"]},
		} {
			t.Run(route.path+"/"+tc.name, func(t *testing.T) {
				repo := &legacyAdminRepo{viewer: uuid.New(), allowed: tc.allowed}
				if tc.fault {
					repo.gateErr = errors.New("lookup failed")
				}
				if tc.contentFault {
					repo.contentErr = errors.New("query failed")
				}
				state := &mockState{}
				repo.state = state
				h := &Handler{postcardRepo: repo, hub: &mockHub{state: state}}
				if tc.missing {
					h.postcardRepo = nil
				}
				if tc.typed {
					h = NewHandler(nil, nil, nil, nil, nil, "")
				}
				r := gin.New()
				auth := middleware.AuthMiddleware(services.NewAuthService(nil, "legacy-admin-test-key"))
				r.Use(auth, func(c *gin.Context) {
					if tc.scoped {
						c.Set("event_id", uuid.New())
						c.Set("event_slug", "stable")
					}
				})
				handlers := map[string]gin.HandlerFunc{"GetSecretBoxStatus": h.GetSecretBoxStatus, "ListSecretPostcards": h.ListSecretPostcards, "RevealSecretBox": h.RevealSecretBox}
				r.Handle(route.method, route.path, handlers[route.handler])
				req := httptest.NewRequest(route.method, route.path, nil)
				if tc.auth != "" {
					token := tc.auth
					if token == "valid" {
						token, err = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": repo.viewer.String(), "email": "fixture@example.test"}).SignedString([]byte("legacy-admin-test-key"))
						require.NoError(t, err)
						token = "Bearer " + token
					}
					req.Header.Set("Authorization", token)
				}
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				require.Equal(t, tc.code, w.Code, w.Body.String())
				require.Equal(t, tc.body, w.Body.String())
				gate, reads, writes := 0, 0, 0
				if tc.auth == "valid" && !tc.missing && !tc.typed && !tc.scoped {
					gate = 1
				}
				if tc.allowed {
					reads = 1
					if route.method == "POST" {
						writes = 1
					}
				}
				require.Equal(t, map[bool]int{true: 1, false: 0}[tc.scoped], repo.scoped)
				require.Equal(t, gate, repo.gates)
				require.Equal(t, reads, repo.reads)
				require.Equal(t, writes, repo.writes)
				require.False(t, state.broadcastCalled)
				require.False(t, state.secretBoxRevealed)
			})
		}
	}
}

func TestLegacyAdminRevealBroadcast(t *testing.T) {
	for _, failure := range []bool{false, true} {
		repo := &legacyAdminRepo{viewer: uuid.New(), allowed: true, cards: []models.Postcard{{ID: uuid.New(), IsSecret: true}}}
		if failure {
			repo.contentErr = errors.New("transaction failed")
		}
		state := &mockState{}
		h := &Handler{postcardRepo: repo, hub: &mockHub{state: state}}
		r := gin.New()
		r.POST("/", func(c *gin.Context) {
			c.Set("user_id", repo.viewer)
			h.RevealSecretBox(c)
		})
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("POST", "/", nil))
		if failure {
			require.Equal(t, 500, w.Code)
			require.Equal(t, `{"error":"Failed to reveal secret box"}`, w.Body.String())
		} else {
			require.Equal(t, 200, w.Code)
			body, err := json.Marshal(gin.H{"message": "Secret Box revealed", "postcards": repo.cards})
			require.NoError(t, err)
			require.Equal(t, string(body), w.Body.String())
		}
		require.Equal(t, !failure, state.broadcastCalled)
		require.Equal(t, 1, repo.gates)
		require.Equal(t, 1, repo.writes)
	}
}

// Missing or malformed context identity must also fail closed if middleware is miswired.
func TestLegacyAdminMissingViewer(t *testing.T) {
	for _, id := range []any{nil, "not a UUID", uuid.Nil} {
		for _, which := range []string{"status", "list", "reveal"} {
			repo := &legacyAdminRepo{}
			h := &Handler{postcardRepo: repo}
			r := gin.New()
			r.GET("/", func(c *gin.Context) {
				if id != nil {
					c.Set("user_id", id)
				}
				switch which {
				case "status":
					h.GetSecretBoxStatus(c)
				case "list":
					h.ListSecretPostcards(c)
				default:
					h.RevealSecretBox(c)
				}
			})
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
			require.Equal(t, 500, w.Code)
			require.Equal(t, `{"error":"Failed to verify permissions"}`, strings.TrimSpace(w.Body.String()))
			require.Zero(t, repo.gates+repo.reads+repo.writes)
		}
	}
}
