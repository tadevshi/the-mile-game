package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

type legacySQL struct {
	answerSQL
	saves, scores int
}

func (s *legacySQL) Connect(context.Context) (driver.Conn, error) { return s, nil }
func (s *legacySQL) ExecContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Result, error) {
	s.writes++
	if s.missing {
		return nil, errors.New("player foreign key violation")
	}
	if strings.Contains(query, "INSERT INTO quiz_answers") {
		s.saves++
	} else if strings.Contains(query, "UPDATE players") {
		s.scores++
	} else if strings.Contains(query, "INSERT INTO players") {
		return driver.RowsAffected(1), nil
	} else {
		return nil, errors.New("unexpected write")
	}
	return driver.RowsAffected(1), nil
}
func (s *legacySQL) QueryContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	if s.missing && strings.Contains(query, "FROM quiz_answers") {
		s.reads++
		return &answerRows{columns: 6}, nil
	}
	if strings.Contains(query, "ORDER BY score") {
		return &answerRows{columns: 6}, nil
	}
	return s.answerSQL.QueryContext(ctx, query, args)
}

type legacyCards struct {
	mockPostcardRepo
	creates int
	event   uuid.UUID
}

func (r *legacyCards) Create(id uuid.UUID, path, message string, rotation float64, sender *string, media string, thumb *string, duration *int) (*models.Postcard, error) {
	r.creates++
	return &models.Postcard{PlayerID: &id, ImagePath: path}, nil
}
func (r *legacyCards) CreateWithEvent(event uuid.UUID, id *uuid.UUID, path, message string, rotation float64, sender *string, media string, thumb *string, duration *int) (*models.Postcard, error) {
	r.event = event
	card, err := r.Create(*id, path, message, rotation, sender, media, thumb, duration)
	card.EventID = event
	return card, err
}

type legacyHub struct {
	mockHub
	rankings int
}

func (h *legacyHub) BroadcastRanking([]models.RankingEntry) { h.rankings++ }

func TestLegacyRecordAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, operation := range []string{"player", "answers", "submit", "postcard"} {
		for _, role := range []string{"anonymous", "unrelated", "owner", "collaborator", "guest", "other event", "public", "orphan", "event missing", "event failure", "nil event", "collab failure", "guest failure", "unconfigured", "player failure", "player missing", "invalid", "inline"} {
			if role == "inline" && operation != "postcard" {
				continue
			}
			t.Run(operation+"/"+role, func(t *testing.T) {
				s := &legacySQL{answerSQL: answerSQL{player: uuid.New(), event: uuid.New()}}
				owner, viewer := uuid.New(), uuid.New()
				event := &models.Event{ID: s.event, OwnerID: owner, Visibility: "private"}
				if role == "public" {
					event.Visibility = "public"
				}
				if role == "orphan" || role == "inline" {
					s.event = uuid.Nil
				}
				if role == "owner" {
					viewer = owner
				}
				if role == "player missing" {
					s.missing = true
				}
				if role == "player failure" {
					s.lookupErr = errors.New("player database unavailable")
				}
				db := sql.OpenDB(s)
				t.Cleanup(func() { require.NoError(t, db.Close()) })
				cards, state := &legacyCards{}, &mockState{}
				hub := &legacyHub{mockHub: mockHub{state: state}}
				dir := t.TempDir()
				h := &Handler{playerRepo: repository.NewPlayerRepository(db), quizRepo: repository.NewQuizRepository(db), postcardRepo: cards, hub: hub, scorer: services.NewScorer(), uploadsDir: dir}
				collab := accessMembership{allowed: role == "collaborator", eventID: event.ID, userID: viewer}
				guest := accessMembership{allowed: role == "guest", eventID: event.ID, userID: viewer}
				if role == "collab failure" {
					collab.err = errors.New("collab unavailable")
				}
				if role == "guest failure" {
					guest.err = errors.New("guest unavailable")
				}
				eventCalls := 0
				lookup := func(id uuid.UUID) (*models.Event, error) {
					eventCalls++
					require.Equal(t, s.event, id)
					if role == "event missing" {
						return nil, repository.ErrEventNotFound
					}
					if role == "event failure" {
						return nil, errors.New("event unavailable")
					}
					if role == "nil event" {
						return nil, nil
					}
					return event, nil
				}
				if role != "unconfigured" {
					h.SetLegacyAccess(lookup, collab, guest)
				}
				r := gin.New()
				r.Use(func(c *gin.Context) {
					if role != "anonymous" {
						c.Set("user_id", viewer)
					}
					c.Next()
				})
				r.GET("/players/:id", h.GetPlayer)
				r.GET("/answers/:playerId", h.GetQuizAnswers)
				r.POST("/submit", h.SubmitQuiz)
				r.POST("/postcard", h.CreatePostcard)
				id := s.player.String()
				if role == "invalid" {
					id = "invalid"
				}
				method, path := "GET", "/players/"+id
				body := bytes.NewBufferString(`{"favorites":{"singer":"test"},"preferences":{},"description":"before"}`)
				contentType := "application/json"
				switch operation {
				case "answers":
					path = "/answers/" + id
				case "submit":
					method, path = "POST", "/submit"
				case "postcard":
					method, path = "POST", "/postcard"
					body = &bytes.Buffer{}
					form := multipart.NewWriter(body)
					file, err := form.CreateFormFile("image", "photo.jpg")
					require.NoError(t, err)
					_, err = file.Write(append([]byte{0xff, 0xd8, 0xff}, make([]byte, 509)...))
					require.NoError(t, err)
					require.NoError(t, form.Close())
					contentType = form.FormDataContentType()
				}
				req := httptest.NewRequest(method, path, body)
				req.Header.Set("Content-Type", contentType)
				if role != "inline" {
					req.Header.Set("X-Player-ID", id)
				}
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				code, message := 200, ""
				if operation == "postcard" {
					code = 201
				}
				switch role {
				case "anonymous":
					code, message = 401, "Authentication required"
				case "unrelated", "other event":
					code, message = 403, "Not authorized to access this event"
				case "event missing", "event failure", "nil event", "collab failure", "guest failure", "unconfigured", "player failure":
					code, message = 500, "Failed to verify permissions"
				case "player missing":
					code, message = 404, "Player not found"
					if operation == "answers" {
						code, message = 404, "Answers not found"
					}
					if operation == "submit" {
						code, message = 500, "Failed to save answers"
					}
				case "invalid":
					code, message = 400, "Invalid player ID"
				}
				if role == "player failure" && (operation == "player" || operation == "postcard") {
					code, message = 404, "Player not found"
				}
				require.Equal(t, code, w.Code, w.Body.String())
				if message != "" {
					require.Equal(t, `{"error":"`+message+`"}`, w.Body.String())
				}
				allowed := code < 400
				writes := 0
				if allowed && operation == "submit" {
					writes = 2
					require.Equal(t, 1, s.saves)
					require.Equal(t, 1, s.scores)
				}
				if role == "inline" || (role == "player missing" && operation == "submit") {
					writes = 1
				}
				require.Equal(t, writes, s.writes)
				if allowed && operation == "submit" {
					require.Equal(t, `{"message":"Quiz submitted successfully","score":0}`, w.Body.String())
				}
				reads := 0
				if (allowed || role == "player missing") && operation == "answers" {
					reads = 1
				}
				require.Equal(t, reads, s.reads)
				creates := 0
				if allowed && operation == "postcard" {
					creates = 1
				}
				require.Equal(t, creates, cards.creates)
				require.Equal(t, creates == 1, state.broadcastCalled)
				rankings := 0
				if allowed && operation == "submit" {
					rankings = 1
				}
				require.Equal(t, rankings, hub.rankings)
				files, err := os.ReadDir(dir)
				require.NoError(t, err)
				require.Len(t, files, creates)
				if creates == 1 {
					expected := uuid.Nil
					if event.Visibility == "private" && s.event != uuid.Nil {
						expected = event.ID
					}
					require.Equal(t, expected, cards.event)
					require.Contains(t, w.Body.String(), `"event_id":"`+expected.String()+`"`)
				}
				if role == "orphan" || role == "invalid" || role == "inline" {
					require.Zero(t, eventCalls)
				}
				lookups := 1
				if role == "invalid" || role == "inline" {
					lookups = 0
				}
				require.Equal(t, lookups, s.lookups)
			})
		}
	}
}

func TestGetPlayerEventIsolation(t *testing.T) {
	for _, mismatch := range []bool{true, false} {
		t.Run(map[bool]string{true: "cross event", false: "same event"}[mismatch], func(t *testing.T) {
			s := &answerSQL{player: uuid.New(), event: uuid.New()}
			db := sql.OpenDB(s)
			t.Cleanup(func() { require.NoError(t, db.Close()) })
			h := &Handler{playerRepo: repository.NewPlayerRepository(db)}
			r := gin.New()
			r.GET("/players/:id", func(c *gin.Context) {
				event := s.event
				if mismatch {
					event = uuid.New()
				}
				c.Set("event_id", event)
				h.GetPlayer(c)
			})
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/players/"+s.player.String(), nil))
			if mismatch {
				require.Equal(t, 404, w.Code)
				require.Equal(t, `{"error":"Player not found"}`, w.Body.String())
			} else {
				require.Equal(t, 200, w.Code)
				require.Contains(t, w.Body.String(), s.player.String())
			}
			require.Equal(t, 1, s.lookups)
			require.Zero(t, s.writes)
		})
	}
}
