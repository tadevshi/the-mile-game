package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// SecretBoxAdminHandler maneja las peticiones admin de Secret Box (token management)
type SecretBoxAdminHandler struct {
	eventRepo EventBySlugGetter
}

// EventBySlugGetter define la operación para obtener un evento por slug.
// Permite inyectar mocks en tests.
type EventBySlugGetter interface {
	GetBySlug(slug string) (*models.Event, error)
}

// NewSecretBoxAdminHandler crea un nuevo handler de admin de Secret Box
func NewSecretBoxAdminHandler(eventRepo EventBySlugGetter) *SecretBoxAdminHandler {
	return &SecretBoxAdminHandler{
		eventRepo: eventRepo,
	}
}

// GetSecretBoxToken GET /api/admin/events/:slug/secret-box/token
// Retorna el token existente o genera uno nuevo si no existe.
func (h *SecretBoxAdminHandler) GetSecretBoxToken(c *gin.Context) {
	slug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Si ya tiene token, retornarlo
	if event.SecretBoxToken != nil && *event.SecretBoxToken != "" {
		c.JSON(http.StatusOK, gin.H{
			"token":     *event.SecretBoxToken,
			"share_url": buildSecretBoxURL(slug, *event.SecretBoxToken),
		})
		return
	}

	// Generar nuevo token
	newToken := uuid.New().String()
	event.SecretBoxToken = &newToken

	// Actualizar en DB usando el eventRepo (que implementa EventUpdater)
	if updater, ok := h.eventRepo.(interface {
		Update(event *models.Event) error
	}); ok {
		if err := updater.Update(event); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save token"})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Event repository does not support updates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     newToken,
		"share_url": buildSecretBoxURL(slug, newToken),
	})
}

// RegenerateSecretBoxToken POST /api/admin/events/:slug/secret-box/token/regenerate
// Invalida el token actual y genera uno nuevo.
func (h *SecretBoxAdminHandler) RegenerateSecretBoxToken(c *gin.Context) {
	slug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Generar nuevo token
	newToken := uuid.New().String()
	event.SecretBoxToken = &newToken

	// Actualizar en DB
	if updater, ok := h.eventRepo.(interface {
		Update(event *models.Event) error
	}); ok {
		if err := updater.Update(event); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save new token"})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Event repository does not support updates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     newToken,
		"share_url": buildSecretBoxURL(slug, newToken),
	})
}

// buildSecretBoxURL construye la URL completa para acceder a la Secret Box
func buildSecretBoxURL(slug, token string) string {
	// En producción esto vendría de una env var o config
	// Por ahora usamos una URL relativa que el frontend completará
	return "/e/" + slug + "/secret-box?token=" + token
}
