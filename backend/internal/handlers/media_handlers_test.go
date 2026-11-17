package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

type mediaFixture struct {
	router        *gin.Engine
	auth          *services.AuthService
	ownerToken    string
	guestToken    string
	outsiderToken string
	collabToken   string
}

const (
	mediaPublicPath   = "/uploads/postcards/media-public.png"
	mediaPrivatePath  = "/uploads/postcards/media-private.png"
	mediaEventless    = "/uploads/postcards/media-eventless.png"
	mediaEndedPath    = "/uploads/postcards/media-ended.png"
	mediaUnknownPath  = "/uploads/postcards/media-unknown.bin"
	mediaContentBytes = "media-bytes"
)

// newMediaFixture builds the media route over a real PostgreSQL and real files.
func newMediaFixture(t *testing.T) *mediaFixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	connString := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		testEnv("TEST_DB_HOST", "localhost"), testEnv("TEST_DB_PORT", "5432"),
		testEnv("TEST_DB_USER", "user"), testEnv("TEST_DB_PASSWORD", "password"),
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
	authService := services.NewAuthService(userRepo, "media-handler-test-secret")
	eventRepo := repository.NewEventRepository(db)
	collaboratorRepo := repository.NewCollaboratorRepository(db)
	guestRepo := repository.NewGuestRepository(db)

	register := func(role string) (uuid.UUID, string) {
		t.Helper()
		email := fmt.Sprintf("media-%s-%s@example.test", role, uuid.NewString())
		response, err := authService.Register(email, "password-123", role+" user")
		if err != nil {
			t.Fatalf("register %s error = %v", role, err)
		}
		t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM users WHERE id = $1`, response.User.ID) })
		return response.User.ID, response.AccessToken
	}

	ownerID, ownerToken := register("owner")
	collaboratorID, collaboratorToken := register("collaborator")
	guestID, guestToken := register("guest")
	_, outsiderToken := register("outsider")

	createEvent := func(slug string, isPublic bool, isActive bool) *models.Event {
		t.Helper()
		event, err := eventRepo.Create(ownerID, slug+"-"+uuid.NewString()[:8], "Media event", "",
			models.EventFeatures{}, models.EventSettings{}, nil, nil)
		if err != nil {
			t.Fatalf("create event error = %v", err)
		}
		if !isPublic {
			if _, err := db.Exec(`UPDATE events SET is_public = FALSE WHERE id = $1`, event.ID); err != nil {
				t.Fatalf("make event private error = %v", err)
			}
		}
		if !isActive {
			if _, err := db.Exec(`UPDATE events SET is_active = FALSE WHERE id = $1`, event.ID); err != nil {
				t.Fatalf("end event error = %v", err)
			}
		}
		t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM events WHERE id = $1`, event.ID) })
		return event
	}

	publicEvent := createEvent("media-public", true, true)
	privateEvent := createEvent("media-private", false, true)
	endedEvent := createEvent("media-ended", true, false)

	if _, err := collaboratorRepo.Create(privateEvent.ID, collaboratorID); err != nil {
		t.Fatalf("create collaborator error = %v", err)
	}
	if _, err := db.Exec(`INSERT INTO event_guests (event_id, user_id) VALUES ($1, $2)`, privateEvent.ID, guestID); err != nil {
		t.Fatalf("insert guest error = %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM event_guests WHERE event_id = $1`, privateEvent.ID) })

	uploadsDir := t.TempDir()
	for _, name := range []string{"media-public.png", "media-private.png", "media-eventless.png", "media-ended.png", "media-unknown.bin"} {
		path := filepath.Join(uploadsDir, "postcards", name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("create uploads dir error = %v", err)
		}
		if err := os.WriteFile(path, []byte(mediaContentBytes), 0o644); err != nil {
			t.Fatalf("write media file error = %v", err)
		}
	}

	insertPostcard := func(path string, eventID *uuid.UUID) {
		t.Helper()
		if _, err := db.Exec(`INSERT INTO postcards (id, event_id, image_path) VALUES ($1, $2, $3)`,
			uuid.New(), eventID, path); err != nil {
			t.Fatalf("insert postcard error = %v", err)
		}
		t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM postcards WHERE image_path = $1`, path) })
	}
	insertPostcard(mediaPublicPath, &publicEvent.ID)
	insertPostcard(mediaPrivatePath, &privateEvent.ID)
	insertPostcard(mediaEndedPath, &endedEvent.ID)
	insertPostcard(mediaEventless, nil)
	insertPostcard(mediaUnknownPath, &publicEvent.ID)

	mediaHandler := NewMediaHandler(
		repository.NewMediaRepository(db),
		services.NewMediaPolicy(eventRepo, collaboratorRepo, guestRepo),
		uploadsDir,
		authService,
	)

	router := gin.New()
	router.GET("/uploads/*filepath", mediaHandler.Serve)

	return &mediaFixture{router: router, auth: authService, ownerToken: ownerToken, guestToken: guestToken, outsiderToken: outsiderToken, collabToken: collaboratorToken}
}

// get performs a media request with an optional bearer token and cookie.
func (f *mediaFixture) get(t *testing.T, path, token, cookieValue string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	if cookieValue != "" {
		request.AddCookie(&http.Cookie{Name: "eventhub_media_session", Value: cookieValue})
	}
	response := httptest.NewRecorder()
	f.router.ServeHTTP(response, request)
	return response
}

// The media of a public event stays readable without an account.
func TestMediaHandlerPublicEventAnonymous(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, mediaPublicPath, "", "")

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (%s)", response.Code, http.StatusOK, response.Body.String())
	}
	if response.Body.String() != mediaContentBytes {
		t.Errorf("body = %q, want %q", response.Body.String(), mediaContentBytes)
	}
	if cache := response.Header().Get("Cache-Control"); cache != "public, max-age=2592000" {
		t.Errorf("Cache-Control = %q, want public, max-age=2592000", cache)
	}
}

// The media of a private event requires an identity.
func TestMediaHandlerPrivateEventRequiresIdentity(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, mediaPrivatePath, "", "")

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	if body := strings.TrimSpace(response.Body.String()); body != `{"error":"Authentication required"}` {
		t.Errorf("body = %q, want the authentication error", body)
	}
}

// An account that is not a member of a private event is refused.
func TestMediaHandlerPrivateEventUnrelatedAccount(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, mediaPrivatePath, fixture.outsiderToken, "")

	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
	if body := strings.TrimSpace(response.Body.String()); body != `{"error":"Not authorized to view this event"}` {
		t.Errorf("body = %q, want the authorization error", body)
	}
}

// The members of a private event read its media and it is not storable.
func TestMediaHandlerPrivateEventMembers(t *testing.T) {
	fixture := newMediaFixture(t)

	for role, token := range map[string]string{
		"owner":        fixture.ownerToken,
		"collaborator": fixture.collabToken,
		"guest":        fixture.guestToken,
	} {
		response := fixture.get(t, mediaPrivatePath, token, "")

		if response.Code != http.StatusOK {
			t.Fatalf("%s: status = %d, want %d (%s)", role, response.Code, http.StatusOK, response.Body.String())
		}
		if cache := response.Header().Get("Cache-Control"); cache != "private, no-store" {
			t.Errorf("%s: Cache-Control = %q, want private, no-store", role, cache)
		}
	}
}

// The media that belongs to no event keeps its current behavior.
func TestMediaHandlerEventlessMedia(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, mediaEventless, "", "")

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (%s)", response.Code, http.StatusOK, response.Body.String())
	}
	if cache := response.Header().Get("Cache-Control"); cache != "public, max-age=2592000" {
		t.Errorf("Cache-Control = %q, want public, max-age=2592000", cache)
	}
}

// The media of an event that ended is gone for every caller.
func TestMediaHandlerEndedEvent(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, mediaEndedPath, "", "")

	if response.Code != http.StatusGone {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusGone)
	}
}

// An unknown path is not a stored media record.
func TestMediaHandlerUnknownPath(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, "/uploads/postcards/does-not-exist.png", "", "")

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotFound)
	}
	if strings.Contains(response.Body.String(), mediaContentBytes) {
		t.Errorf("body = %q, want no media served", response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); strings.HasPrefix(contentType, "image/") {
		t.Errorf("Content-Type = %q, want no media content type", contentType)
	}
}

// A traversal attempt never reaches the disk.
func TestMediaHandlerRejectsTraversal(t *testing.T) {
	fixture := newMediaFixture(t)

	for _, path := range []string{"/uploads/../secret.txt", "/uploads/postcards//public.png"} {
		response := fixture.get(t, path, "", "")
		if response.Code != http.StatusBadRequest {
			t.Errorf("path %q: status = %d, want %d", path, response.Code, http.StatusBadRequest)
		}
	}
}

// The httpOnly session cookie is the native credential of the media route.
func TestMediaHandlerAcceptsSessionCookie(t *testing.T) {
	fixture := newMediaFixture(t)

	response := fixture.get(t, mediaPrivatePath, "", fixture.ownerToken)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (%s)", response.Code, http.StatusOK, response.Body.String())
	}

	forged := fixture.get(t, mediaPrivatePath, "", "forged-token")
	if forged.Code != http.StatusUnauthorized {
		t.Fatalf("forged cookie status = %d, want %d", forged.Code, http.StatusUnauthorized)
	}
}

// The content type mirrors the current delivery and is never sniffed.
func TestMediaHandlerContentType(t *testing.T) {
	fixture := newMediaFixture(t)

	png := fixture.get(t, mediaPublicPath, "", "")
	if contentType := png.Header().Get("Content-Type"); contentType != "image/png" {
		t.Errorf("Content-Type = %q, want image/png", contentType)
	}
	if nosniff := png.Header().Get("X-Content-Type-Options"); nosniff != "nosniff" {
		t.Errorf("X-Content-Type-Options = %q, want nosniff", nosniff)
	}

	unknown := fixture.get(t, mediaUnknownPath, "", "")
	if contentType := unknown.Header().Get("Content-Type"); contentType != "application/octet-stream" {
		t.Errorf("Content-Type = %q, want application/octet-stream", contentType)
	}
	if nosniff := unknown.Header().Get("X-Content-Type-Options"); nosniff != "nosniff" {
		t.Errorf("X-Content-Type-Options = %q, want nosniff", nosniff)
	}
}

// A range request answers with the partial bytes of the media.
func TestMediaHandlerRangeRequest(t *testing.T) {
	fixture := newMediaFixture(t)

	request := httptest.NewRequest(http.MethodGet, mediaPublicPath, nil)
	request.Header.Set("Range", "bytes=0-3")
	response := httptest.NewRecorder()
	fixture.router.ServeHTTP(response, request)

	if response.Code != http.StatusPartialContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusPartialContent)
	}
	if response.Body.String() != mediaContentBytes[:4] {
		t.Errorf("body = %q, want %q", response.Body.String(), mediaContentBytes[:4])
	}
}

// The API keeps the Bearer token: the media cookie is not an API credential.
func TestMediaCookieIsNotAnAPICredential(t *testing.T) {
	fixture := newMediaFixture(t)

	api := gin.New()
	api.Use(middleware.AuthMiddleware(fixture.auth))
	api.GET("/api/auth/me", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	withCookie := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	withCookie.AddCookie(&http.Cookie{Name: "eventhub_media_session", Value: fixture.ownerToken})
	cookieResponse := httptest.NewRecorder()
	api.ServeHTTP(cookieResponse, withCookie)
	if cookieResponse.Code != http.StatusUnauthorized {
		t.Errorf("cookie only status = %d, want %d", cookieResponse.Code, http.StatusUnauthorized)
	}

	withBearer := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	withBearer.Header.Set("Authorization", "Bearer "+fixture.ownerToken)
	bearerResponse := httptest.NewRecorder()
	api.ServeHTTP(bearerResponse, withBearer)
	if bearerResponse.Code != http.StatusOK {
		t.Errorf("bearer status = %d, want %d", bearerResponse.Code, http.StatusOK)
	}
}

// The CORS policy belongs to the CORS middleware: the media route never
// answers with a wildcard and never sets its own origin header.
func TestMediaHandlerDoesNotSetItsOwnCORSHeaders(t *testing.T) {
	fixture := newMediaFixture(t)

	request := httptest.NewRequest(http.MethodGet, mediaPublicPath, nil)
	request.Header.Set("Origin", "https://app.example.test")
	response := httptest.NewRecorder()
	fixture.router.ServeHTTP(response, request)

	if allowed := response.Header().Get("Access-Control-Allow-Origin"); allowed == "*" {
		t.Error("Access-Control-Allow-Origin must never be a wildcard")
	}
	if vary := response.Header().Get("Vary"); strings.Contains(vary, "Origin") {
		t.Error("the handler must not set Vary, the CORS middleware owns it")
	}
}
