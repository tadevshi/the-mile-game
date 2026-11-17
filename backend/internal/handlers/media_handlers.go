package handlers

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

const (
	// mediaUploadsPrefix is the public prefix of the stored media paths.
	mediaUploadsPrefix = "/uploads/"
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

	record, err := h.mediaRepo.FindByPath(mediaUploadsPrefix + relativePath)
	if err != nil {
		if errors.Is(err, repository.ErrMediaNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve media"})
		return
	}

	decision, cacheControl := h.policy.Decide(record, h.identity(c))
	switch decision {
	case services.MediaNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	case services.MediaGone:
		c.JSON(http.StatusGone, gin.H{"error": "Event has ended"})
		return
	case services.MediaUnauthorized:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	case services.MediaForbidden:
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view this event"})
		return
	case services.MediaFailed:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify event access"})
		return
	}

	file, err := os.Open(filepath.Join(h.uploadsDir, filepath.FromSlash(relativePath)))
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open media"})
		return
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open media"})
		return
	}

	c.Header("Content-Type", mediaContentType(relativePath))
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", cacheControl)

	// ServeContent answers the range requests of the video postcards.
	http.ServeContent(c.Writer, c.Request, filepath.Base(relativePath), stat.ModTime(), file)
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
