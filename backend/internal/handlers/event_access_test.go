package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

type scopedAccessFixture struct {
	db      *sql.DB
	handler *Handler
	players *repository.PlayerRepository
	quiz    *repository.QuizRepository
	eventA  *models.Event
	eventB  *models.Event
	playerA *models.Player
	playerB *models.Player
}

func newScopedAccessFixture(t *testing.T) *scopedAccessFixture {
	t.Helper()
	dbHost := testEnv("TEST_DB_HOST", "localhost")
	dbPort := testEnv("TEST_DB_PORT", "5432")
	dbUser := testEnv("TEST_DB_USER", "user")
	dbPass := testEnv("TEST_DB_PASSWORD", "password")
	dbName := testEnv("TEST_DB_NAME", "milegame_test")
	connString := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := sql.Open("postgres", connString)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatalf("database ping error = %v", err)
	}

	ownerID := uuid.New()
	if _, err := db.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`, ownerID, ownerID.String()+"@example.test", "test-hash", "Visibility Test Owner"); err != nil {
		t.Fatalf("insert test owner error = %v", err)
	}

	eventRepo := repository.NewEventRepository(db)
	eventA, err := eventRepo.Create(ownerID, "access-a-"+uuid.NewString(), "Access A", "", models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create event A error = %v", err)
	}
	eventB, err := eventRepo.Create(ownerID, "access-b-"+uuid.NewString(), "Access B", "", models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create event B error = %v", err)
	}

	players := repository.NewPlayerRepository(db)
	playerA, err := players.CreateWithEvent(eventA.ID, "Player A", "👤")
	if err != nil {
		t.Fatalf("create player A error = %v", err)
	}
	playerB, err := players.CreateWithEvent(eventB.ID, "Player B", "👤")
	if err != nil {
		t.Fatalf("create player B error = %v", err)
	}

	quiz := repository.NewQuizRepository(db)
	if err := quiz.SaveAnswers(playerA.ID, map[string]string{"favorite": "A"}, map[string]string{}, "private answer A"); err != nil {
		t.Fatalf("save player A answers error = %v", err)
	}
	if err := quiz.SaveAnswers(playerB.ID, map[string]string{"favorite": "B"}, map[string]string{}, "private answer B"); err != nil {
		t.Fatalf("save player B answers error = %v", err)
	}

	handler := NewHandler(
		players,
		quiz,
		repository.NewQuizQuestionRepository(db),
		repository.NewPostcardRepository(db, ""),
		nil,
		"",
	)
	// The legacy routes resolve the persisted event visibility.
	handler.WithLegacyVisibility(NewLegacyEventVisibility(
		eventRepo,
		repository.NewCollaboratorRepository(db),
		repository.NewGuestRepository(db),
	))
	return &scopedAccessFixture{db: db, handler: handler, players: players, quiz: quiz, eventA: eventA, eventB: eventB, playerA: playerA, playerB: playerB}
}

func testEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func serveScopedPlayerLookup(handler *Handler, eventID, playerID uuid.UUID) *httptest.ResponseRecorder {
	router := gin.New()
	router.GET("/api/events/:slug/players/:id", func(c *gin.Context) {
		c.Set("event_id", eventID)
		handler.GetPlayer(c)
	})
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/events/test/players/"+playerID.String(), nil)
	router.ServeHTTP(response, request)
	return response
}

func serveLegacyPlayerLookup(handler *Handler, playerID uuid.UUID) *httptest.ResponseRecorder {
	router := gin.New()
	router.GET("/api/players/:id", handler.GetPlayer)
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/players/"+playerID.String(), nil)
	router.ServeHTTP(response, request)
	return response
}

func serveScopedAnswerLookup(handler *Handler, eventID, playerID uuid.UUID) *httptest.ResponseRecorder {
	router := gin.New()
	router.GET("/api/events/:slug/quiz/answers/:playerId", func(c *gin.Context) {
		c.Set("event_id", eventID)
		handler.GetQuizAnswers(c)
	})
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/events/test/quiz/answers/"+playerID.String(), nil)
	router.ServeHTTP(response, request)
	return response
}

func serveLegacyAnswerLookup(handler *Handler, playerID uuid.UUID) *httptest.ResponseRecorder {
	router := gin.New()
	router.GET("/api/quiz/answers/:playerId", handler.GetQuizAnswers)
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/quiz/answers/"+playerID.String(), nil)
	router.ServeHTTP(response, request)
	return response
}

func TestGetPlayerScopedIsolationPreservesLegacyBehavior(t *testing.T) {
	gin.SetMode(gin.TestMode)
	fixture := newScopedAccessFixture(t)

	crossEvent := serveScopedPlayerLookup(fixture.handler, fixture.eventB.ID, fixture.playerA.ID)
	if crossEvent.Code != http.StatusNotFound {
		t.Errorf("cross-event scoped lookup status = %d, want 404; body=%s", crossEvent.Code, crossEvent.Body.String())
	}
	if got, want := crossEvent.Body.String(), "{\"error\":\"Player not found\"}"; got != want {
		t.Errorf("cross-event scoped lookup body = %q, want %q", got, want)
	}

	sameEvent := serveScopedPlayerLookup(fixture.handler, fixture.eventA.ID, fixture.playerA.ID)
	if sameEvent.Code != http.StatusOK {
		t.Errorf("same-event scoped lookup status = %d, want 200; body=%s", sameEvent.Code, sameEvent.Body.String())
	}

	legacy := serveLegacyPlayerLookup(fixture.handler, fixture.playerA.ID)
	if legacy.Code != http.StatusOK {
		t.Errorf("legacy lookup without event context status = %d, want 200; body=%s", legacy.Code, legacy.Body.String())
	}

	stored, err := fixture.players.GetByID(fixture.playerA.ID)
	if err != nil {
		t.Fatalf("read player after rejected lookup error = %v", err)
	}
	if stored.EventID != fixture.eventA.ID || stored.Name != fixture.playerA.Name || stored.Score != fixture.playerA.Score {
		t.Errorf("rejected lookup changed player: got event/name/score %s/%q/%d, want %s/%q/%d", stored.EventID, stored.Name, stored.Score, fixture.eventA.ID, fixture.playerA.Name, fixture.playerA.Score)
	}
}

func TestGetQuizAnswersScopedIsolationPreservesLegacyBehavior(t *testing.T) {
	gin.SetMode(gin.TestMode)
	fixture := newScopedAccessFixture(t)

	crossEvent := serveScopedAnswerLookup(fixture.handler, fixture.eventB.ID, fixture.playerA.ID)
	if crossEvent.Code != http.StatusNotFound {
		t.Errorf("cross-event scoped answer lookup status = %d, want 404; body=%s", crossEvent.Code, crossEvent.Body.String())
	}
	if got, want := crossEvent.Body.String(), "{\"error\":\"Answers not found\"}"; got != want {
		t.Errorf("cross-event scoped answer lookup body = %q, want %q", got, want)
	}

	sameEvent := serveScopedAnswerLookup(fixture.handler, fixture.eventB.ID, fixture.playerB.ID)
	if sameEvent.Code != http.StatusOK {
		t.Errorf("same-event answer lookup status = %d, want 200; body=%s", sameEvent.Code, sameEvent.Body.String())
	}

	legacy := serveLegacyAnswerLookup(fixture.handler, fixture.playerA.ID)
	if legacy.Code != http.StatusOK {
		t.Errorf("legacy answer lookup without event context status = %d, want 200; body=%s", legacy.Code, legacy.Body.String())
	}

	stored, err := fixture.quiz.GetAnswersByPlayerID(fixture.playerA.ID)
	if err != nil {
		t.Fatalf("read answers after rejected lookup error = %v", err)
	}
	if stored.Description != "private answer A" || stored.Favorites["favorite"] != "A" {
		t.Errorf("rejected lookup changed answers: got description/favorite %q/%q, want %q/%q", stored.Description, stored.Favorites["favorite"], "private answer A", "A")
	}
}
