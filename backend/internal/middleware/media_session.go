package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/the-mile-game/backend/internal/models"
)

// MediaSessionCookieName is the cookie that carries the account identity to the
// native browser media requests. A native element such as an image or a video
// cannot send an Authorization header, so the identity travels in this cookie.
const MediaSessionCookieName = "eventhub_media_session"

// MediaTokenValidator validates the access token of a request and reports the
// lifetime of the issued tokens.
type MediaTokenValidator interface {
	ValidateToken(tokenString string) (*models.JWTClaims, error)
	AccessTokenTTL() time.Duration
}

// MediaSessionCookieMiddleware issues the media session cookie for the requests
// that already carry a valid access token. The cookie is scoped to /uploads,
// so it never travels to the API routes and it cannot be used to change any
// state.
func MediaSessionCookieMiddleware(validator MediaTokenValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := BearerToken(c.GetHeader("Authorization"))
		if token != "" {
			current, err := c.Cookie(MediaSessionCookieName)
			if err != nil || current != token {
				if _, err := validator.ValidateToken(token); err == nil {
					SetMediaSessionCookie(c, token, validator.AccessTokenTTL())
				}
			}
		}
		c.Next()
	}
}

// SetMediaSessionCookie writes the media session cookie for the given access
// token. It is httpOnly, so no script can read it, and it is restricted to the
// media paths.
func SetMediaSessionCookie(c *gin.Context, token string, ttl time.Duration) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     MediaSessionCookieName,
		Value:    token,
		Path:     "/uploads",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
		Secure:   IsSecureRequest(c),
	})
}

// ClearMediaSessionCookie removes the media session cookie.
func ClearMediaSessionCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     MediaSessionCookieName,
		Value:    "",
		Path:     "/uploads",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Secure:   IsSecureRequest(c),
	})
}

// BearerToken extracts the token of an Authorization header. It returns an
// empty string when the header is absent or malformed.
func BearerToken(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

// IsSecureRequest reports whether the request reached the server over HTTPS,
// either directly or through a proxy that forwards the original scheme.
func IsSecureRequest(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	return strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
}
