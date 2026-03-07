package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// EventMiddleware crea un middleware que resuelve el evento por slug
func EventMiddleware(eventRepo *repository.EventRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if slug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event slug is required"})
			c.Abort()
			return
		}

		// Buscar evento por slug
		event, err := eventRepo.GetBySlug(slug)
		if err != nil {
			if err == repository.ErrEventNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
				c.Abort()
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event"})
			c.Abort()
			return
		}

		// Verificar que el evento esté activo
		if !event.IsActive {
			c.JSON(http.StatusGone, gin.H{"error": "Event has ended"})
			c.Abort()
			return
		}

		// Agregar evento al contexto
		c.Set("event", event)
		c.Set("event_id", event.ID)

		c.Next()
	}
}

// QuizFeatureMiddleware verifica que el quiz esté habilitado para el evento
func QuizFeatureMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		event, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}

		eventModel := event.(*models.Event)
		if !eventModel.Features.Quiz {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz feature not enabled for this event"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CorkboardFeatureMiddleware verifica que el corkboard esté habilitado
func CorkboardFeatureMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		event, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}

		eventModel := event.(*models.Event)
		if !eventModel.Features.Corkboard {
			c.JSON(http.StatusNotFound, gin.H{"error": "Corkboard feature not enabled for this event"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SecretBoxFeatureMiddleware verifica que secret box esté habilitado
func SecretBoxFeatureMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		event, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}

		eventModel := event.(*models.Event)
		if !eventModel.Features.SecretBox {
			c.JSON(http.StatusNotFound, gin.H{"error": "Secret Box feature not enabled for this event"})
			c.Abort()
			return
		}

		c.Next()
	}
}
