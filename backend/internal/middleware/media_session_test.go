package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

type fakeMediaTokenValidator struct {
	validToken string
	ttl        time.Duration
}

func (f *fakeMediaTokenValidator) ValidateToken(tokenString string) (*models.JWTClaims, error) {
	if tokenString != f.validToken {
		return nil, errors.New("invalid token")
	}
	return &models.JWTClaims{UserID: uuid.New(), Email: "owner@example.com"}, nil
}

func (f *fakeMediaTokenValidator) AccessTokenTTL() time.Duration {
	return f.ttl
}

func newMediaSessionRouter(validator MediaTokenValidator) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(MediaSessionCookieMiddleware(validator))
	r.GET("/api/ping", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })
	return r
}

func mediaSessionCookie(t *testing.T, response *http.Response) *http.Cookie {
	t.Helper()
	for _, cookie := range response.Cookies() {
		if cookie.Name == MediaSessionCookieName {
			return cookie
		}
	}
	return nil
}

func TestMediaSessionCookieIsIssuedForAnAuthenticatedRequest(t *testing.T) {
	validator := &fakeMediaTokenValidator{validToken: "valid-token", ttl: 15 * time.Minute}
	router := newMediaSessionRouter(validator)

	request := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
	request.Header.Set("Authorization", "Bearer valid-token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	cookie := mediaSessionCookie(t, recorder.Result())
	if cookie == nil {
		t.Fatal("expected the media session cookie to be issued")
	}
	if cookie.Value != "valid-token" {
		t.Fatalf("expected the cookie to carry the access token, got %q", cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Error("expected the media session cookie to be httpOnly")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("expected SameSite=Lax, got %v", cookie.SameSite)
	}
	if cookie.Path != "/uploads" {
		t.Errorf("expected the cookie to be scoped to /uploads, got %q", cookie.Path)
	}
	if cookie.MaxAge != int((15 * time.Minute).Seconds()) {
		t.Errorf("expected Max-Age to match the access token lifetime, got %d", cookie.MaxAge)
	}
	if cookie.Domain != "" {
		t.Errorf("expected a host-only cookie, got domain %q", cookie.Domain)
	}
	if cookie.Secure {
		t.Error("expected the cookie to not be secure over plain HTTP")
	}
}

func TestMediaSessionCookieIsNotReissuedForTheSameToken(t *testing.T) {
	validator := &fakeMediaTokenValidator{validToken: "valid-token", ttl: 15 * time.Minute}
	router := newMediaSessionRouter(validator)

	request := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
	request.Header.Set("Authorization", "Bearer valid-token")
	request.AddCookie(&http.Cookie{Name: MediaSessionCookieName, Value: "valid-token"})
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if cookie := mediaSessionCookie(t, recorder.Result()); cookie != nil {
		t.Fatal("expected no cookie to be issued when the client already carries it")
	}
}

func TestMediaSessionCookieIsNotIssuedForAnInvalidOrAbsentToken(t *testing.T) {
	validator := &fakeMediaTokenValidator{validToken: "valid-token", ttl: 15 * time.Minute}
	router := newMediaSessionRouter(validator)

	cases := map[string]map[string]string{
		"invalid token": {"Authorization": "Bearer forged-token"},
		"no token":      {},
	}

	for name, headers := range cases {
		request := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
		for key, value := range headers {
			request.Header.Set(key, value)
		}
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, request)

		if cookie := mediaSessionCookie(t, recorder.Result()); cookie != nil {
			t.Errorf("%s: expected no media session cookie, got %q", name, cookie.Value)
		}
	}
}

func TestMediaSessionCookieIsSecureBehindAForwardedHTTPSRequest(t *testing.T) {
	validator := &fakeMediaTokenValidator{validToken: "valid-token", ttl: 15 * time.Minute}
	router := newMediaSessionRouter(validator)

	request := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
	request.Header.Set("Authorization", "Bearer valid-token")
	request.Header.Set("X-Forwarded-Proto", "https")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	cookie := mediaSessionCookie(t, recorder.Result())
	if cookie == nil {
		t.Fatal("expected the media session cookie to be issued")
	}
	if !cookie.Secure {
		t.Error("expected the cookie to be secure behind a forwarded HTTPS request")
	}
}

// The logout response clears the cookie: the middleware never issues a fresh
// credential there.
func TestMediaSessionCookieIsNotIssuedOnLogout(t *testing.T) {
	validator := &fakeMediaTokenValidator{validToken: "valid-token", ttl: 15 * time.Minute}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(MediaSessionCookieMiddleware(validator))
	router.POST("/api/auth/logout", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	request := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	request.Header.Set("Authorization", "Bearer valid-token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if cookie := mediaSessionCookie(t, recorder.Result()); cookie != nil {
		t.Fatalf("expected no media session cookie on the logout response, got %q", cookie.Value)
	}
}
