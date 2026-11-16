package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// EventMembershipChecker reports whether an account belongs to an event.
type EventMembershipChecker interface {
	Exists(eventID, userID uuid.UUID) (bool, error)
}

// EventVisibilityMiddleware protects current event-scoped content while leaving
// public events anonymous. Owners, collaborators, and accepted guests may read
// private events; membership does not grant administrative permissions.
func EventVisibilityMiddleware(collaborators, guests EventMembershipChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		eventValue, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}

		event, ok := eventValue.(*models.Event)
		if !ok || event == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}

		if event.IsPublic {
			c.Next()
			return
		}

		userValue, exists := c.Get("user_id")
		userID, ok := userValue.(uuid.UUID)
		if !exists || !ok || userID == uuid.Nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		if userID == event.OwnerID {
			c.Next()
			return
		}

		isCollaborator, err := collaborators.Exists(event.ID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify event access"})
			c.Abort()
			return
		}
		if isCollaborator {
			c.Next()
			return
		}

		isGuest, err := guests.Exists(event.ID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify event access"})
			c.Abort()
			return
		}
		if !isGuest {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view this event"})
			c.Abort()
			return
		}

		c.Next()
	}
}
