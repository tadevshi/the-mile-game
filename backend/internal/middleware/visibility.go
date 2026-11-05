package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// CheckEventVisibility authorizes viewing only. A nil viewer means anonymous.
func CheckEventVisibility(event *models.Event, viewer *uuid.UUID, collaborators, guests CollaboratorChecker) (int, string) {
	// Empty visibility supports existing in-memory fixtures; DB values are constrained.
	if event.Visibility == models.EventVisibilityPublic || event.Visibility == "" {
		return 0, ""
	}
	if viewer == nil {
		return http.StatusUnauthorized, "Authentication required"
	}
	if *viewer == event.OwnerID {
		return 0, ""
	}
	for _, membership := range []CollaboratorChecker{collaborators, guests} {
		allowed, err := membership.Exists(event.ID, *viewer)
		if err != nil {
			return http.StatusInternalServerError, "Failed to verify permissions"
		}
		if allowed {
			return 0, ""
		}
	}
	return http.StatusForbidden, "Not authorized to access this event"
}

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
		var viewer *uuid.UUID
		if value, exists := c.Get("user_id"); exists && event.Visibility != models.EventVisibilityPublic && event.Visibility != "" {
			id := value.(uuid.UUID)
			viewer = &id
		}
		if status, message := CheckEventVisibility(event, viewer, collaborators, guests); status != 0 {
			c.AbortWithStatusJSON(status, gin.H{"error": message})
			return
		}
		c.Next()
	}
}
