package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

// legacyAdminFixture wires the legacy administration routes and the
// event-scoped administration routes against the disposable test database.
//
// Events created by the fixture:
//   - ownedEvent: owned by the owner account, the collaborator account is a
//     collaborator and the guest account is an accepted guest.
//   - extraEvent: a second event owned by the owner account, so the owner
//     administers two events while the collaborator administers only one.
//   - foreignEvent: owned by an unrelated account, so no caller of the
//     fixture except its own owner may administer it.
type legacyAdminFixture struct {
	db               *sql.DB
	handler          *Handler
	hub              *fakeBroadcastHub
	legacy           *gin.Engine
	scoped           *gin.Engine
	ownerOnly        *gin.Engine
	questions        *gin.Engine
	postcardRepo     *repository.PostcardRepository
	eventRepo        *repository.EventRepository
	collaboratorRepo *repository.CollaboratorRepository
	guestRepo        *repository.GuestRepository

	ownerToken        string
	collaboratorToken string
	guestToken        string
	outsiderToken     string
	foreignToken      string

	ownedEvent   *models.Event
	extraEvent   *models.Event
	foreignEvent *models.Event

	ownedSecretIDs   []uuid.UUID
	extraSecretIDs   []uuid.UUID
	foreignSecretIDs []uuid.UUID
	ownedQuestionID  uuid.UUID
}

// legacyRequest performs an HTTP request against the given router with an
// optional bearer token.
func legacyRequest(t *testing.T, router *gin.Engine, method, path, token string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, path, nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

// createLegacyAdminSecret stores a secret postcard for the given event.
func createLegacyAdminSecret(t *testing.T, repo *repository.PostcardRepository, eventID uuid.UUID, message string) uuid.UUID {
	t.Helper()
	postcard, err := repo.CreateSecret(eventID, "sender of "+message, "/uploads/postcards/"+message+".jpg", message, 0, "image", nil, nil)
	if err != nil {
		t.Fatalf("create secret postcard %q error = %v", message, err)
	}
	return postcard.ID
}

// secretRevealedAt reads the stored revealed_at of a postcard.
func secretRevealedAt(t *testing.T, db *sql.DB, postcardID uuid.UUID) *time.Time {
	t.Helper()
	var revealedAt *time.Time
	if err := db.QueryRow(`SELECT revealed_at FROM postcards WHERE id = $1`, postcardID).Scan(&revealedAt); err != nil {
		t.Fatalf("read revealed_at of %s error = %v", postcardID, err)
	}
	return revealedAt
}

func newLegacyAdminFixture(t *testing.T) *legacyAdminFixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	connString := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		testEnv("TEST_DB_HOST", "localhost"),
		testEnv("TEST_DB_PORT", "5432"),
		testEnv("TEST_DB_USER", "user"),
		testEnv("TEST_DB_PASSWORD", "password"),
		testEnv("TEST_DB_NAME", "milegame_test"))

	db, err := sql.Open("postgres", connString)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatalf("database ping error = %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo, "legacy-admin-test-secret")
	eventRepo := repository.NewEventRepository(db)
	collaboratorRepo := repository.NewCollaboratorRepository(db)
	guestRepo := repository.NewGuestRepository(db)
	playerRepo := repository.NewPlayerRepository(db)
	quizRepo := repository.NewQuizRepository(db)
	quizQuestionRepo := repository.NewQuizQuestionRepository(db)
	postcardRepo := repository.NewPostcardRepository(db, "")

	ownerID, ownerToken := registerLegacyTestUser(t, authService, "legacy-admin-owner")
	collaboratorID, collaboratorToken := registerLegacyTestUser(t, authService, "legacy-admin-collaborator")
	guestID, guestToken := registerLegacyTestUser(t, authService, "legacy-admin-guest")
	_, outsiderToken := registerLegacyTestUser(t, authService, "legacy-admin-outsider")
	foreignOwnerID, foreignToken := registerLegacyTestUser(t, authService, "legacy-admin-foreign")

	features := models.EventFeatures{Quiz: true, Corkboard: true, SecretBox: true}
	ownedEvent, err := eventRepo.Create(ownerID, "legacy-admin-owned-"+uuid.NewString(), "Legacy Admin Owned", "", features, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create owned event error = %v", err)
	}
	foreignEvent, err := eventRepo.Create(foreignOwnerID, "legacy-admin-foreign-"+uuid.NewString(), "Legacy Admin Foreign", "", features, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create foreign event error = %v", err)
	}
	extraEvent, err := eventRepo.Create(ownerID, "legacy-admin-extra-"+uuid.NewString(), "Legacy Admin Extra", "", features, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("create extra event error = %v", err)
	}

	if _, err := collaboratorRepo.Create(ownedEvent.ID, collaboratorID); err != nil {
		t.Fatalf("create collaborator error = %v", err)
	}
	if _, err := db.Exec(`INSERT INTO event_guests (event_id, user_id) VALUES ($1, $2)`, ownedEvent.ID, guestID); err != nil {
		t.Fatalf("insert guest error = %v", err)
	}

	ownedSecretIDs := []uuid.UUID{
		createLegacyAdminSecret(t, postcardRepo, ownedEvent.ID, "owned secret one"),
		createLegacyAdminSecret(t, postcardRepo, ownedEvent.ID, "owned secret two"),
	}
	foreignSecretIDs := []uuid.UUID{
		createLegacyAdminSecret(t, postcardRepo, foreignEvent.ID, "foreign secret"),
	}
	extraSecretIDs := []uuid.UUID{
		createLegacyAdminSecret(t, postcardRepo, extraEvent.ID, "owned extra secret"),
	}

	ownedQuestion, err := quizQuestionRepo.Create(ownedEvent.ID, "favorites", "fav-"+uuid.NewString(), "¿Cancion favorita?", []string{"A"}, nil, 0, true)
	if err != nil {
		t.Fatalf("create quiz question error = %v", err)
	}

	uploadsDir := t.TempDir()
	handler := NewHandler(playerRepo, quizRepo, quizQuestionRepo, postcardRepo, nil, uploadsDir)
	hub := &fakeBroadcastHub{}
	handler.hub = hub
	handler.WithLegacyAdminScope(NewLegacyAdminScope(eventRepo, collaboratorRepo))

	// Legacy administration routes: optional identity, the handler decides.
	legacy := gin.New()
	legacy.Use(middleware.OptionalAuthMiddleware(authService))
	legacy.GET("/api/admin/status", handler.GetSecretBoxStatus)
	legacy.GET("/api/admin/secret-box", handler.ListSecretPostcards)
	legacy.POST("/api/admin/reveal", handler.RevealSecretBox)

	// Event-scoped administration routes keep the production wiring.
	scoped := gin.New()
	scopedAdmin := scoped.Group("/api/admin/events/:slug")
	scopedAdmin.Use(middleware.EventMiddleware(eventRepo))
	scopedAdmin.Use(middleware.AuthMiddleware(authService))
	scopedAdmin.Use(middleware.AdminMiddleware(collaboratorRepo))
	scopedAdmin.GET("/status", handler.GetSecretBoxStatus)
	scopedAdmin.GET("/secret-box", handler.ListSecretPostcards)
	scopedAdmin.POST("/reveal", handler.RevealSecretBox)

	// Owner-only administration routes (Secret Box token management).
	secretBoxHandler := NewSecretBoxAdminHandler(eventRepo)
	ownerOnly := gin.New()
	ownerOnlyAdmin := ownerOnly.Group("/api/admin/events/:slug")
	ownerOnlyAdmin.Use(middleware.EventMiddleware(eventRepo))
	ownerOnlyAdmin.Use(middleware.AuthMiddleware(authService))
	ownerOnlyAdmin.Use(middleware.OwnerOnlyMiddleware())
	ownerOnlyAdmin.GET("/secret-box/token", secretBoxHandler.GetSecretBoxToken)

	// Question administration routes keep their ownership check.
	questions := gin.New()
	questionAdmin := questions.Group("/api/admin/questions")
	questionAdmin.Use(middleware.AuthMiddleware(authService))
	questionAdmin.PUT("/:id", NewAdminQuestionHandler(quizQuestionRepo, eventRepo, eventRepo).UpdateQuestion)

	return &legacyAdminFixture{
		db:                db,
		handler:           handler,
		hub:               hub,
		legacy:            legacy,
		scoped:            scoped,
		ownerOnly:         ownerOnly,
		questions:         questions,
		postcardRepo:      postcardRepo,
		eventRepo:         eventRepo,
		collaboratorRepo:  collaboratorRepo,
		guestRepo:         guestRepo,
		ownerToken:        ownerToken,
		collaboratorToken: collaboratorToken,
		guestToken:        guestToken,
		outsiderToken:     outsiderToken,
		foreignToken:      foreignToken,
		ownedEvent:        ownedEvent,
		extraEvent:        extraEvent,
		foreignEvent:      foreignEvent,
		ownedSecretIDs:    ownedSecretIDs,
		extraSecretIDs:    extraSecretIDs,
		foreignSecretIDs:  foreignSecretIDs,
		ownedQuestionID:   ownedQuestion.ID,
	}
}

// legacyAdminRoutes are the three legacy administration routes.
var legacyAdminRoutes = []struct {
	method string
	path   string
}{
	{http.MethodGet, "/api/admin/status"},
	{http.MethodGet, "/api/admin/secret-box"},
	{http.MethodPost, "/api/admin/reveal"},
}
