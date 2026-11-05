package handlers

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

// This boundary double checks identity/branch selection, not the SQL policy:
// TestPlayerVisibleSet exercises that policy against PostgreSQL.
type visiblePlayerSQL struct {
	answerSQL
	query          string
	args           []driver.NamedValue
	empty, failure bool
}

func (s *visiblePlayerSQL) Connect(context.Context) (driver.Conn, error) { return s, nil }
func (s *visiblePlayerSQL) QueryContext(_ context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	s.query, s.args = query, args
	if s.failure {
		return nil, errors.New("database unavailable")
	}
	r := &answerRows{columns: 6}
	if !s.empty {
		r.values = []driver.Value{uuid.Nil.String(), nil, "Legacy", "avatar", int64(7), time.Unix(0, 0).UTC()}
	}
	return r, nil
}

func TestLegacyPlayerVisibilityHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	viewer, event := uuid.New(), uuid.New()
	auth := services.NewAuthService(nil, "visibility-test-key")
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": viewer.String(), "email": "viewer@example.com", "exp": time.Now().Add(time.Hour).Unix(), "type": "access",
	}).SignedString([]byte("visibility-test-key"))
	require.NoError(t, err)
	for _, endpoint := range []string{"players", "ranking"} {
		for _, tc := range []struct {
			name, header           string
			scoped, empty, failure bool
		}{
			{name: "anonymous"}, {name: "malformed", header: "Basic bad"}, {name: "invalid", header: "Bearer bad"},
			{name: "authenticated", header: "Bearer " + token}, {name: "empty", empty: true}, {name: "failure", failure: true},
			{name: "scoped public authenticated unchanged", header: "Bearer " + token, scoped: true},
		} {
			t.Run(endpoint+"/"+tc.name, func(t *testing.T) {
				s := &visiblePlayerSQL{empty: tc.empty, failure: tc.failure}
				db := sql.OpenDB(s)
				t.Cleanup(func() { require.NoError(t, db.Close()) })
				h := &Handler{playerRepo: repository.NewPlayerRepository(db)}
				r := gin.New()
				r.Use(middleware.OptionalAuthMiddleware(auth))
				path := "/api/" + endpoint
				handler := h.ListPlayers
				if endpoint == "ranking" {
					handler = h.GetRanking
				}
				if tc.scoped {
					path = "/api/events/public/" + endpoint
					r.Use(func(c *gin.Context) { c.Set("event_id", event); c.Next() })
					if endpoint == "players" {
						handler = h.ListPlayersScoped
					}
				}
				r.GET(path, handler)
				w := httptest.NewRecorder()
				req := httptest.NewRequest("GET", path, nil)
				req.Header.Set("Authorization", tc.header)
				r.ServeHTTP(w, req)
				code, body := 200, ""
				if tc.failure {
					code = 500
					message := "Failed to list players"
					if endpoint == "ranking" {
						message = "Failed to get ranking"
					}
					body = `{"error":"` + message + `"}`
				} else if tc.empty {
					body = "null"
					if endpoint == "ranking" {
						body = "[]"
					}
				} else {
					p := models.Player{Name: "Legacy", Avatar: "avatar", Score: 7, CreatedAt: time.Unix(0, 0).UTC()}
					var payload any = []models.Player{p}
					if endpoint == "ranking" {
						payload = []models.RankingEntry{{Position: 1, Player: p}}
					}
					b, err := json.Marshal(payload)
					require.NoError(t, err)
					body = string(b)
				}
				require.Equal(t, code, w.Code)
				require.Equal(t, body, w.Body.String())
				require.Zero(t, s.writes)
				require.Len(t, s.args, 1)
				var want any
				if tc.header == "Bearer "+token {
					want = viewer.String()
				}
				if tc.scoped {
					want = event.String()
					require.Contains(t, s.query, "WHERE event_id = $1")
				} else {
					require.Contains(t, s.query, "LEFT JOIN events e")
				}
				require.Equal(t, want, s.args[0].Value)
			})
		}
	}
}

func TestLegacyPlayerOptionalAuthWiring(t *testing.T) {
	data, err := os.ReadFile("../../cmd/api/main.go")
	require.NoError(t, err)
	for _, route := range []string{
		`api.GET("/players", optionalAuthMiddleware, handler.ListPlayers)`,
		`api.GET("/ranking", optionalAuthMiddleware, handler.GetRanking)`,
	} {
		require.True(t, strings.Contains(string(data), route), route)
	}
}
