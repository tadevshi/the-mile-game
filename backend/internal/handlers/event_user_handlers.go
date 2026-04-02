package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// EventRepo defines the repository interface for event operations
type EventRepo interface {
	ListByOwner(ownerID uuid.UUID) ([]models.Event, error)
	Create(ownerID uuid.UUID, slug, name, description string,
		features models.EventFeatures, settings models.EventSettings,
		startsAt, endsAt *time.Time) (*models.Event, error)
	Delete(id uuid.UUID) error
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve events"})
		return
	}

	// Return empty array instead of null if no events
	if events == nil {
		events = []models.Event{}
	}

	c.JSON(http.StatusOK, events)
}

// generateSlug creates a URL-friendly slug from a name
func generateSlug(name string) string {
	// Convert to lowercase
	slug := strings.ToLower(name)
	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters (keep only alphanumeric and hyphens)
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	slug = result.String()
	// Remove consecutive hyphens
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")
	// Add a short unique suffix
	suffix := uuid.New().String()[:6]
	return slug + "-" + suffix
}

// CreateEvent creates a new event for the authenticated user
func (h *EventHandler) CreateEvent(c *gin.Context) {
	// Get user_id from context (set by AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var req models.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Generate slug if not provided or empty
	slug := req.Slug
	if slug == nil || strings.TrimSpace(*slug) == "" {
		generated := generateSlug(req.Name)
		slug = &generated
	}

	// Create event
	var startsAt, endsAt *time.Time
	if req.StartsAt != nil {
		t := req.StartsAt.Time
		startsAt = &t
	}
	if req.EndsAt != nil {
		t := req.EndsAt.Time
		endsAt = &t
	}

	event, err := h.eventRepo.Create(
		userID.(uuid.UUID),
		*slug,
		req.Name,
		req.Description,
		req.Features,
		req.Settings,
		startsAt,
		endsAt,
	)
	if err != nil {
		if err == repository.ErrDuplicateSlug {
			c.JSON(http.StatusConflict, gin.H{"error": "Event slug already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	c.JSON(http.StatusCreated, event)
}

// DeleteEvent deletes an event owned by the authenticated user.
// Expects the event to already be loaded in context by EventMiddleware,
// and ownership verified by OwnerMiddleware (admin route).
func (h *EventHandler) DeleteEvent(c *gin.Context) {
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
		return
	}

	eventModel := event.(*models.Event)

	if err := h.eventRepo.Delete(eventModel.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted"})
}
