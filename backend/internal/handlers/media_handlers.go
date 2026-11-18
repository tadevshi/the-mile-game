package handlers

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

const (
	// mediaUploadsPrefix is the public prefix of the stored media paths.
	mediaUploadsPrefix = "/uploads/"

	// mediaErrorCacheControl keeps the answers that depend on the identity of
	// the caller out of every cache.
	mediaErrorCacheControl = "private, no-store"
)

// TokenValidator validates an access token.
type TokenValidator interface {
	ValidateToken(token string) (*models.JWTClaims, error)
}

// MediaHandler serves the stored media under the current event policy.
type MediaHandler struct {
	mediaRepo  *repository.MediaRepository
	policy     *services.MediaPolicy
	uploadsDir string
	auth       TokenValidator
}

// NewMediaHandler creates the media handler.
func NewMediaHandler(mediaRepo *repository.MediaRepository, policy *services.MediaPolicy, uploadsDir string, auth TokenValidator) *MediaHandler {
	return &MediaHandler{mediaRepo: mediaRepo, policy: policy, uploadsDir: uploadsDir, auth: auth}
}

// Serve delivers a stored media file. The stored paths are not migrated: the
// media keeps being served from the same locations as before.
func (h *MediaHandler) Serve(c *gin.Context) {
	relativePath, ok := mediaRelativePath(c.Request.URL.Path)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media path"})
		return
	}

	records, err := h.mediaRepo.FindByPath(mediaUploadsPrefix + relativePath)
	if err != nil {
		if errors.Is(err, repository.ErrMediaNotFound) {
			h.deny(c, http.StatusNotFound, "Media not found")
			return
		}
		h.deny(c, http.StatusInternalServerError, "Failed to resolve media")
		return
	}

	decision, cacheControl := h.policy.DecideAll(records, h.identity(c))
	switch decision {
	case services.MediaNotFound:
		h.deny(c, http.StatusNotFound, "Media not found")
		return
	case services.MediaGone:
		h.deny(c, http.StatusGone, "Event has ended")
		return
	case services.MediaUnauthorized:
		h.deny(c, http.StatusUnauthorized, "Authentication required")
		return
	case services.MediaForbidden:
		h.deny(c, http.StatusForbidden, "Not authorized to view this event")
		return
	case services.MediaFailed:
		h.deny(c, http.StatusInternalServerError, "Failed to verify event access")
		return
	}

	file, err := os.Open(filepath.Join(h.uploadsDir, filepath.FromSlash(relativePath)))
	if err != nil {
		if os.IsNotExist(err) {
			h.deny(c, http.StatusNotFound, "Media not found")
			return
		}
		h.deny(c, http.StatusInternalServerError, "Failed to open media")
		return
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		h.deny(c, http.StatusInternalServerError, "Failed to open media")
		return
	}

	c.Header("Content-Type", mediaContentType(relativePath))
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", cacheControl)

	// ServeContent answers the range requests of the video postcards.
	http.ServeContent(c.Writer, c.Request, filepath.Base(relativePath), stat.ModTime(), file)
}

// deny answers a media request that must not serve the file. The answer
// depends on the identity of the caller, so it is never stored by an
// intermediary or by a private browser cache.
func (h *MediaHandler) deny(c *gin.Context, status int, message string) {
	c.Header("Cache-Control", mediaErrorCacheControl)
	c.JSON(status, gin.H{"error": message})
}

// identity resolves the account identity of a media request. The Bearer token
// comes first, exactly as in the API, and the httpOnly session cookie is the
// fallback for the native browser requests. An absent, malformed or invalid
// token means "no identity": it never fails a public media.
func (h *MediaHandler) identity(c *gin.Context) uuid.UUID {
	token := ""
	if header := c.GetHeader("Authorization"); header != "" {
		if len(header) > 7 && header[:7] == "Bearer " {
			token = strings.TrimSpace(header[7:])
		}
	} else if cookie, err := c.Cookie(services.MediaSessionCookieName); err == nil {
		token = cookie
	}

	if token == "" || h.auth == nil {
		return uuid.Nil
	}
	claims, err := h.auth.ValidateToken(token)
	if err != nil || claims == nil {
		return uuid.Nil
	}
	return claims.UserID
}

// mediaRelativePath returns the path of the media relative to the uploads
// directory. A path that does not live under /uploads/, that traverses the
// directory or that has an empty segment is rejected.
func mediaRelativePath(requestPath string) (string, bool) {
	if !strings.HasPrefix(requestPath, mediaUploadsPrefix) {
		return "", false
	}
	relativePath := strings.TrimPrefix(requestPath, mediaUploadsPrefix)
	if relativePath == "" {
		return "", false
	}
	if strings.ContainsRune(relativePath, 0) {
		return "", false
	}
	if !utf8.ValidString(relativePath) {
		return "", false
	}
	for _, segment := range strings.Split(relativePath, "/") {
		if segment == "" || segment == "." || segment == ".." {
			return "", false
		}
	}
	return relativePath, true
}

// mediaContentType mirrors the content type of the current delivery.
func mediaContentType(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}
