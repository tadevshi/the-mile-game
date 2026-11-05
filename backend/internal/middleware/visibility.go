package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// EventVisibilityMiddleware authorizes content viewing, never administration.
// Run after EventMiddleware and OptionalAuthMiddleware, not on secret uploads.
func EventVisibilityMiddleware(collaborators, guests CollaboratorChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		value, exists := c.Get("event")
		if !exists {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			return
		}
		event := value.(*models.Event)
		// Empty visibility supports existing in-memory fixtures; DB values are constrained.
		if event.Visibility == models.EventVisibilityPublic || event.Visibility == "" {
			c.Next()
			return
		}
		value, exists = c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}
		userID := value.(uuid.UUID)
		if userID == event.OwnerID {
			c.Next()
			return
		}
		for _, membership := range []CollaboratorChecker{collaborators, guests} {
			allowed, err := membership.Exists(event.ID, userID)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
				return
			}
			if allowed {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Not authorized to access this event"})
	}
}
