package handlers

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// Use the repository tests' database/sql boundary-double pattern so real
// repositories run, while unexpected reads and every write remain observable.
type answerSQL struct {
	player, event          uuid.UUID
	lookupErr              error
	missing                bool
	lookups, reads, writes int
}

func (s *answerSQL) Connect(context.Context) (driver.Conn, error) { return s, nil }
func (s *answerSQL) Driver() driver.Driver                        { return s }
func (s *answerSQL) Open(string) (driver.Conn, error)             { return s, nil }
func (s *answerSQL) Close() error                                 { return nil }
func (s *answerSQL) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (s *answerSQL) Begin() (driver.Tx, error) {
	return nil, errors.New("unexpected transaction")
}
func (s *answerSQL) ExecContext(context.Context, string, []driver.NamedValue) (driver.Result, error) {
	s.writes++
	return nil, errors.New("unexpected write")
}
func (s *answerSQL) QueryContext(_ context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	if len(args) != 1 || args[0].Value != s.player.String() {
		return nil, errors.New("incorrect player lookup")
	}
	if strings.Contains(query, "FROM players") {
		s.lookups++
		if s.lookupErr != nil {
			return nil, s.lookupErr
		}
		if s.missing {
			return &answerRows{columns: 6}, nil
		}
		return &answerRows{columns: 6, values: []driver.Value{s.player.String(), s.event.String(), "Player", "avatar", int64(7), time.Unix(0, 0).UTC()}}, nil
	}
	if strings.Contains(query, "FROM quiz_answers") {
		s.reads++
		return &answerRows{columns: 6, values: []driver.Value{s.player.String(), s.player.String(), []byte(`{"singer":"test"}`), []byte(`{"coffee":"tea"}`), "Private description", time.Unix(0, 0).UTC()}}, nil
	}
	return nil, errors.New("unexpected query")
}

type answerRows struct {
	columns int
	values  []driver.Value
}

func (r *answerRows) Columns() []string { return make([]string, r.columns) }
func (r *answerRows) Close() error      { return nil }
func (r *answerRows) Next(values []driver.Value) error {
	if r.values == nil {
		return io.EOF
	}
	copy(values, r.values)
	r.values = nil
	return nil
}

func TestQuizAnswersEventIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name                                          string
		scoped, mismatch, missing, failure, malformed bool
		code, lookups, reads                          int
		message                                       string
	}{
		{name: "same event unchanged", scoped: true, code: 200, lookups: 1, reads: 1},
		{name: "public slug cannot read private player", scoped: true, mismatch: true, code: 404, lookups: 1, message: "Player not found"},
		{name: "missing player", scoped: true, missing: true, code: 404, lookups: 1, message: "Player not found"},
		{name: "lookup failure fails closed", scoped: true, failure: true, code: 404, lookups: 1, message: "Player not found"},
		{name: "malformed scoped ID", scoped: true, malformed: true, code: 400, message: "Invalid player ID"},
		{name: "legacy unchanged with public player lookup", code: 200, lookups: 1, reads: 1},
		{name: "legacy malformed unchanged", malformed: true, code: 400, message: "Invalid player ID"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := &answerSQL{player: uuid.New(), event: uuid.New(), missing: tc.missing}
			if tc.failure {
				s.lookupErr = errors.New("database unavailable")
			}
			beforePlayer, beforeEvent := s.player, s.event
			db := sql.OpenDB(s)
			t.Cleanup(func() { require.NoError(t, db.Close()) })
			h := &Handler{playerRepo: repository.NewPlayerRepository(db), quizRepo: repository.NewQuizRepository(db)}
			h.SetLegacyAccess(func(uuid.UUID) (*models.Event, error) {
				return &models.Event{ID: s.event, Visibility: "public"}, nil
			}, accessMembership{}, accessMembership{})
			r := gin.New()
			r.Use(func(c *gin.Context) {
				if tc.scoped {
					eventID := s.event
					if tc.mismatch {
						eventID = uuid.New()
					}
					c.Set("event_id", eventID)
					c.Set("event", &models.Event{ID: eventID, Visibility: "public"})
				}
				c.Next()
			})
			path, route := "/api/quiz/answers/", "/api/quiz/answers/:playerId"
			if tc.scoped {
				path, route = "/api/events/public-party/quiz/answers/", "/api/events/:slug/quiz/answers/:playerId"
			}
			r.GET(route, h.GetQuizAnswers)
			id := s.player.String()
			if tc.malformed {
				id = "invalid"
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", path+id, nil))
			require.Equal(t, tc.code, w.Code, w.Body.String())
			if tc.code == 200 {
				require.Equal(t, `{"id":"`+id+`","player_id":"`+id+`","favorites":{"singer":"test"},"preferences":{"coffee":"tea"},"description":"Private description","created_at":"1970-01-01T00:00:00Z"}`, w.Body.String())
			} else {
				require.Equal(t, `{"error":"`+tc.message+`"}`, w.Body.String())
			}
			require.Equal(t, tc.lookups, s.lookups)
			require.Equal(t, tc.reads, s.reads)
			require.Zero(t, s.writes)
			require.Equal(t, beforePlayer, s.player)
			require.Equal(t, beforeEvent, s.event)
		})
	}
}
