package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// CollaboratorChecker define la operación para verificar si un usuario es colaborador
type CollaboratorChecker interface {
	Exists(eventID, userID uuid.UUID) (bool, error)
}

// AdminMiddleware verifica que el usuario autenticado sea owner del evento
// o un colaborador con permisos de administración.
// Todos los colaboradores tienen acceso completo de admin (full admin).
func AdminMiddleware(collabRepo CollaboratorChecker) gin.HandlerFunc {
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
		if currentUserID == eventModel.OwnerID {
			c.Next()
			return
		}

		// Verificar si es colaborador (todos los colaboradores tienen full admin)
		isCollaborator, err := collabRepo.Exists(eventModel.ID, currentUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
			c.Abort()
			return
		}

		if isCollaborator {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized. You are not the owner or a collaborator of this event"})
		c.Abort()
	}
}

// OwnerOnlyMiddleware verifica que solo el owner real del evento pueda acceder.
// Útil para operaciones sensibles como gestionar colaboradores o eliminar el evento.
func OwnerOnlyMiddleware() gin.HandlerFunc {
	return OwnerMiddleware()
}
