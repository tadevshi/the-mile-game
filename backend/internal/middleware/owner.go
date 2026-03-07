package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// OwnerMiddleware verifica que el usuario autenticado sea el owner del evento
func OwnerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener user_id del contexto (seteado por AuthMiddleware)
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Obtener evento del contexto (seteado por EventMiddleware)
		event, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}

		eventModel := event.(*models.Event)
		currentUserID := userID.(uuid.UUID)

		// Verificar ownership
		if currentUserID != eventModel.OwnerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized. You are not the owner of this event"})
			c.Abort()
			return
		}

		c.Next()
	}
}
