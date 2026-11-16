package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

type fakeBroadcastHub struct {
	rankingBroadcasts  int
	postcardBroadcasts int
	// globalRankingEntries records the last ranking broadcast sent to the
	// global room, roomRankingEntries the last one sent to an event room.
	globalRankingEntries []models.RankingEntry
	roomRankingEntries   []models.RankingEntry
	// secretRevealGlobal counts the global (non room-scoped) secret reveal
	// broadcasts and secretRevealRooms records the rooms that received one.
	secretRevealGlobal   int
	secretRevealRooms    []string
	secretRevealMessages map[string][]string
}

func (h *fakeBroadcastHub) BroadcastRanking(ranking []models.RankingEntry) {
	h.rankingBroadcasts++
	h.globalRankingEntries = ranking
}

func (h *fakeBroadcastHub) BroadcastPostcard(postcard models.Postcard) {
	h.postcardBroadcasts++
}

func (h *fakeBroadcastHub) BroadcastSecretReveal(postcards []models.Postcard) {
	h.secretRevealGlobal++
}

func (h *fakeBroadcastHub) BroadcastRankingToRoom(eventSlug string, ranking []models.RankingEntry) {
	h.rankingBroadcasts++
	h.roomRankingEntries = ranking
}

func (h *fakeBroadcastHub) BroadcastPostcardToRoom(eventSlug string, postcard models.Postcard) {
	h.postcardBroadcasts++
}

func (h *fakeBroadcastHub) BroadcastSecretRevealToRoom(eventSlug string, postcards []models.Postcard) {
	h.secretRevealRooms = append(h.secretRevealRooms, eventSlug)
	if h.secretRevealMessages == nil {
		h.secretRevealMessages = map[string][]string{}
	}
	messages := make([]string, 0, len(postcards))
	for _, postcard := range postcards {
		messages = append(messages, postcard.Message)
	}
	h.secretRevealMessages[eventSlug] = append(h.secretRevealMessages[eventSlug], messages...)
}

func (h *fakeBroadcastHub) BroadcastSecretResetToRoom(eventSlug string, count int64) {}

func (h *fakeBroadcastHub) BroadcastCorkboardClearedToRoom(eventSlug string, count int64) {}

type legacyVisibilityFixture struct {
	db         *sql.DB
	handler    *Handler
	hub        *fakeBroadcastHub
	router     *gin.Engine
	scoped     *gin.Engine
	uploadsDir string
	auth       *services.AuthService

	playerRepo       *repository.PlayerRepository
	quizRepo         *repository.QuizRepository
	quizQuestionRepo *repository.QuizQuestionRepository
	postcardRepo     *repository.PostcardRepository

	ownerToken        string
	collaboratorToken string
	guestToken        string
	outsiderToken     string

	publicEvent   *models.Event
	privateEvent  *models.Event
	publicPlayer  *models.Player
	privatePlayer *models.Player
	legacyPlayer  *models.Player

	publicDescription  string
	privateDescription string
}

func registerLegacyTestUser(t *testing.T, authService *services.AuthService, role string) (uuid.UUID, string) {
	t.Helper()
	email := fmt.Sprintf("%s-%s@example.test", role, uuid.NewString())
	response, err := authService.Register(email, "password-123", role+" user")
	if err != nil {
		t.Fatalf("register %s error = %v", role, err)
	}
	return response.User.ID, response.AccessToken
}

func newLegacyVisibilityFixture(t *testing.T) *legacyVisibilityFixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

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

	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo, "legacy-visibility-test-secret")
	eventRepo := repository.NewEventRepository(db)
	collaboratorRepo := repository.NewCollaboratorRepository(db)
	guestRepo := repository.NewGuestRepository(db)
	playerRepo := repository.NewPlayerRepository(db)
	quizRepo := repository.NewQuizRepository(db)
	postcardRepo := repository.NewPostcardRepository(db, "")

	ownerID, ownerToken := registerLegacyTestUser(t, authService, "owner")
	collaboratorID, collaboratorToken := registerLegacyTestUser(t, authService, "collaborator")
	guestID, guestToken := registerLegacyTestUser(t, authService, "guest")
	_, outsiderToken := registerLegacyTestUser(t, authService, "outsider")

	features := models.EventFeatures{Quiz: true, Corkboard: true}
	publicEvent, err := eventRepo.Create(ownerID, "legacy-public-"+uuid.NewString(), "Legacy Public", "", features, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create public event error = %v", err)
	}
	privateEvent, err := eventRepo.Create(ownerID, "legacy-private-"+uuid.NewString(), "Legacy Private", "", features, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create private event error = %v", err)
	}
	if _, err := db.Exec(`UPDATE events SET is_public = FALSE WHERE id = $1`, privateEvent.ID); err != nil {
		t.Fatalf("make event private error = %v", err)
	}

	if _, err := collaboratorRepo.Create(privateEvent.ID, collaboratorID); err != nil {
		t.Fatalf("create collaborator error = %v", err)
	}
	if _, err := db.Exec(`INSERT INTO event_guests (event_id, user_id) VALUES ($1, $2)`, privateEvent.ID, guestID); err != nil {
		t.Fatalf("insert guest error = %v", err)
	}

	publicPlayer, err := playerRepo.CreateWithEvent(publicEvent.ID, "Legacy Public Player", "👤")
	if err != nil {
		t.Fatalf("create public player error = %v", err)
	}
	privatePlayer, err := playerRepo.CreateWithEvent(privateEvent.ID, "Legacy Private Player", "👤")
	if err != nil {
		t.Fatalf("create private player error = %v", err)
	}
	legacyPlayer, err := playerRepo.Create("Legacy Eventless Player", "👤")
	if err != nil {
		t.Fatalf("create eventless player error = %v", err)
	}

	publicDescription := "public description " + uuid.NewString()
	privateDescription := "private description " + uuid.NewString()
	if err := quizRepo.SaveAnswers(publicPlayer.ID, map[string]string{"favorite": "A"}, map[string]string{}, publicDescription); err != nil {
		t.Fatalf("save public answers error = %v", err)
	}
	if err := quizRepo.SaveAnswers(privatePlayer.ID, map[string]string{"favorite": "B"}, map[string]string{}, privateDescription); err != nil {
		t.Fatalf("save private answers error = %v", err)
	}

	if _, err := postcardRepo.CreateWithEvent(publicEvent.ID, &publicPlayer.ID, "/uploads/postcards/legacy-public.jpg", "public postcard", 0, nil, "image", nil, nil); err != nil {
		t.Fatalf("create public postcard error = %v", err)
	}
	if _, err := postcardRepo.CreateWithEvent(privateEvent.ID, &privatePlayer.ID, "/uploads/postcards/legacy-private.jpg", "private postcard", 0, nil, "image", nil, nil); err != nil {
		t.Fatalf("create private postcard error = %v", err)
	}

	uploadsDir := t.TempDir()
	handler := NewHandler(playerRepo, quizRepo, repository.NewQuizQuestionRepository(db), postcardRepo, nil, uploadsDir)
	hub := &fakeBroadcastHub{}
	handler.hub = hub
	handler.WithLegacyVisibility(NewLegacyEventVisibility(eventRepo, collaboratorRepo, guestRepo))

	router := gin.New()
	router.Use(middleware.OptionalAuthMiddleware(authService))
	router.POST("/api/players", handler.CreatePlayer)
	router.GET("/api/players/:id", handler.GetPlayer)
	router.GET("/api/players", handler.ListPlayers)
	router.POST("/api/quiz/submit", handler.SubmitQuiz)
	router.GET("/api/quiz/answers/:playerId", handler.GetQuizAnswers)
	router.GET("/api/quiz/descriptions", handler.GetDescriptions)
	router.GET("/api/ranking", handler.GetRanking)
	router.POST("/api/postcards", handler.CreatePostcard)
	router.GET("/api/postcards", handler.ListPostcards)

	scoped := gin.New()
	scoped.Use(middleware.EventMiddleware(eventRepo))
	scoped.Use(middleware.OptionalAuthMiddleware(authService))
	scoped.Use(middleware.EventVisibilityMiddleware(collaboratorRepo, guestRepo))
	scoped.GET("/api/events/:slug/players/:id", handler.GetPlayer)
	scoped.POST("/api/events/:slug/quiz/submit", handler.SubmitQuiz)
	scoped.GET("/api/events/:slug/quiz/answers/:playerId", handler.GetQuizAnswers)

	return &legacyVisibilityFixture{
		db:                 db,
		handler:            handler,
		hub:                hub,
		router:             router,
		scoped:             scoped,
		uploadsDir:         uploadsDir,
		auth:               authService,
		playerRepo:         playerRepo,
		quizRepo:           quizRepo,
		quizQuestionRepo:   repository.NewQuizQuestionRepository(db),
		postcardRepo:       postcardRepo,
		ownerToken:         ownerToken,
		collaboratorToken:  collaboratorToken,
		guestToken:         guestToken,
		outsiderToken:      outsiderToken,
		publicEvent:        publicEvent,
		privateEvent:       privateEvent,
		publicPlayer:       publicPlayer,
		privatePlayer:      privatePlayer,
		legacyPlayer:       legacyPlayer,
		publicDescription:  publicDescription,
		privateDescription: privateDescription,
	}
}

func legacyGet(t *testing.T, router *gin.Engine, path, token string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func legacyPostJSON(t *testing.T, router *gin.Engine, path, token string, payload any, playerID string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload error = %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	if playerID != "" {
		request.Header.Set("X-Player-ID", playerID)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

// legacyPostPostcard sends a multipart postcard upload.
func legacyPostPostcard(t *testing.T, router *gin.Engine, token, playerID string) *httptest.ResponseRecorder {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	if err := writer.WriteField("message", "legacy postcard"); err != nil {
		t.Fatalf("write message field error = %v", err)
	}
	part, err := writer.CreateFormFile("media", "photo.jpg")
	if err != nil {
		t.Fatalf("create form file error = %v", err)
	}
	if _, err := part.Write([]byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00, 0x01}); err != nil {
		t.Fatalf("write media error = %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer error = %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/postcards", body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	if playerID != "" {
		request.Header.Set("X-Player-ID", playerID)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func decodeJSON(t *testing.T, response *httptest.ResponseRecorder, target any) {
	t.Helper()
	if err := json.Unmarshal(response.Body.Bytes(), target); err != nil {
		t.Fatalf("decode response body %q error = %v", response.Body.String(), err)
	}
}

func playerIDs(t *testing.T, response *httptest.ResponseRecorder) []string {
	t.Helper()
	var players []models.Player
	decodeJSON(t, response, &players)
	ids := make([]string, 0, len(players))
	for _, player := range players {
		ids = append(ids, player.ID.String())
	}
	return ids
}

func rankingPlayerIDs(t *testing.T, response *httptest.ResponseRecorder) []string {
	t.Helper()
	var ranking []models.RankingEntry
	decodeJSON(t, response, &ranking)
	ids := make([]string, 0, len(ranking))
	for _, entry := range ranking {
		ids = append(ids, entry.Player.ID.String())
	}
	return ids
}

func postcardMessages(t *testing.T, response *httptest.ResponseRecorder) []string {
	t.Helper()
	var postcards []models.Postcard
	decodeJSON(t, response, &postcards)
	messages := make([]string, 0, len(postcards))
	for _, postcard := range postcards {
		messages = append(messages, postcard.Message)
	}
	return messages
}

func descriptionList(t *testing.T, response *httptest.ResponseRecorder) []string {
	t.Helper()
	var payload struct {
		Descriptions []string `json:"descriptions"`
	}
	decodeJSON(t, response, &payload)
	return payload.Descriptions
}

// answerDescription extracts the stored description of a quiz answer payload.
func answerDescription(t *testing.T, response *httptest.ResponseRecorder) string {
	t.Helper()
	var answers models.QuizAnswers
	decodeJSON(t, response, &answers)
	return answers.Description
}

func containsString(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func countStoredFiles(t *testing.T, dir string) int {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0
		}
		t.Fatalf("read uploads dir error = %v", err)
	}
	count := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			count++
		}
	}
	return count
}

// ---------------------------------------------------------------------------
// Rule 2 + 3: public events stay readable, private events are filtered/denied
// ---------------------------------------------------------------------------
