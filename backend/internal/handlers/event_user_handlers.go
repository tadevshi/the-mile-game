package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// EventRepo defines the repository interface for event operations
type EventRepo interface {
	ListByOwner(ownerID uuid.UUID) ([]models.Event, error)
}

// EventHandler handles user event endpoints
type EventHandler struct {
	eventRepo EventRepo
}

// NewEventHandler creates a new event handler
func NewEventHandler(eventRepo *repository.EventRepository) *EventHandler {
	return &EventHandler{
		eventRepo: eventRepo,
	}
}

// GetUserEvents returns all events owned by the current authenticated user
func (h *EventHandler) GetUserEvents(c *gin.Context) {
	// Get user_id from context (set by AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Query events by owner
	events, err := h.eventRepo.ListByOwner(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return empty array instead of null if no events
	if events == nil {
		events = []models.Event{}
	}

	c.JSON(http.StatusOK, events)
}
