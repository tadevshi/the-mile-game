package handlers

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"net/http/httptest"
	"os"
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

// SQL policy is covered against PostgreSQL in TestLegacyContentVisibleSet.
type visibleContentSQL struct {
	visiblePlayerSQL
	descriptions bool
}

func (s *visibleContentSQL) Connect(context.Context) (driver.Conn, error) { return s, nil }
func (s *visibleContentSQL) QueryContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	_, err := s.visiblePlayerSQL.QueryContext(ctx, query, args)
	if err != nil {
		return nil, err
	}
	rows := &answerRows{columns: 15}
	if s.descriptions {
		rows.columns = 1
	}
	if !s.empty {
		rows.values = []driver.Value{uuid.Nil.String(), nil, nil, nil, "Invitado", "👤", "image.png", "message", float64(2), false, nil, time.Unix(0, 0).UTC(), "image", nil, nil}
		if s.descriptions {
			rows.values = []driver.Value{"  description  "}
		}
	}
	return rows, nil
}

func TestLegacyContentVisibilityHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	viewer, event := uuid.New(), uuid.New()
	auth := services.NewAuthService(nil, "content-test-key")
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": viewer.String(), "type": "access", "exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte("content-test-key"))
	require.NoError(t, err)
	for _, endpoint := range []string{"postcards", "quiz/descriptions"} {
		for _, tc := range []struct {
			name, header           string
			empty, failure, scoped bool
		}{
			{name: "anonymous"}, {name: "invalid", header: "Bearer invalid"}, {name: "member", header: "Bearer " + token},
			{name: "empty", empty: true}, {name: "failure", failure: true}, {name: "scoped public preserved", header: "Bearer " + token, scoped: true},
		} {
			if tc.scoped && endpoint != "postcards" {
				continue
			}
			t.Run(endpoint+"/"+tc.name, func(t *testing.T) {
				s := &visibleContentSQL{visiblePlayerSQL: visiblePlayerSQL{empty: tc.empty, failure: tc.failure}, descriptions: endpoint != "postcards"}
				db := sql.OpenDB(s)
				t.Cleanup(func() { require.NoError(t, db.Close()) })
				h := &Handler{postcardRepo: repository.NewPostcardRepository(db, ""), quizRepo: repository.NewQuizRepository(db)}
				r := gin.New()
				r.Use(middleware.OptionalAuthMiddleware(auth))
				if tc.scoped {
					r.Use(func(c *gin.Context) { c.Set("event_id", event); c.Next() })
				}
				handler := h.ListPostcards
				body := "[]"
				message := "Failed to list postcards"
				if s.descriptions {
					handler = h.GetDescriptions
					body = `{"descriptions":[]}`
					message = "Failed to get descriptions"
				}
				r.GET("/api/"+endpoint, handler)
				req := httptest.NewRequest("GET", "/api/"+endpoint+"?event_id="+uuid.NewString()+"&slug=ignored", nil)
				req.Header.Set("Authorization", tc.header)
				req.Header.Set("X-Secret-Token", "not-a-read-grant")
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				code := 200
				if tc.failure {
					code = 500
					body = `{"error":"` + message + `"}`
				} else if !tc.empty {
					var payload any = []models.Postcard{{PlayerName: "Invitado", PlayerAvatar: "👤", ImagePath: "image.png", Message: "message", Rotation: 2, CreatedAt: time.Unix(0, 0).UTC(), MediaType: "image"}}
					if s.descriptions {
						payload = gin.H{"descriptions": []string{"  description  "}}
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
					require.Contains(t, s.query, "WHERE p.event_id = $1")
				}
				require.Equal(t, want, s.args[0].Value)
			})
		}
	}
}

func TestLegacyContentOptionalAuthWiring(t *testing.T) {
	data, err := os.ReadFile("../../cmd/api/main.go")
	require.NoError(t, err)
	require.Contains(t, string(data), `api.GET("/postcards", optionalAuthMiddleware, handler.ListPostcards)`)
	require.Contains(t, string(data), `api.GET("/quiz/descriptions", optionalAuthMiddleware, handler.GetDescriptions)`)
}
