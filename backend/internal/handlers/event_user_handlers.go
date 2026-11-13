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
	ListAccessibleByUser(userID uuid.UUID, collaboratorEventIDs []uuid.UUID) ([]models.Event, error)
	Create(ownerID uuid.UUID, slug, name, description string,
		features models.EventFeatures, settings models.EventSettings,
		startsAt, endsAt *time.Time) (*models.Event, error)
	Delete(id uuid.UUID) error
}

// CollaboratorEventIDsGetter defines the operation to get event IDs where user is collaborator
type CollaboratorEventIDsGetter interface {
	GetEventsByUser(userID uuid.UUID) ([]uuid.UUID, error)
}

// EventHandler handles user event endpoints
type EventHandler struct {
	eventRepo  EventRepo
	collabRepo CollaboratorEventIDsGetter
}

// NewEventHandler creates a new event handler
func NewEventHandler(eventRepo EventRepo, collabRepo CollaboratorEventIDsGetter) *EventHandler {
	return &EventHandler{
		eventRepo:  eventRepo,
		collabRepo: collabRepo,
	}
}

// GetUserEvents returns all events owned by or shared with the current authenticated user
func (h *EventHandler) GetUserEvents(c *gin.Context) {
	// Get user_id from context (set by AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserID := userID.(uuid.UUID)

	// Get event IDs where user is collaborator
	var collaboratorEventIDs []uuid.UUID
	if h.collabRepo != nil {
		collaboratorEventIDs, _ = h.collabRepo.GetEventsByUser(currentUserID)
	}

	// Query events by owner or collaborator access
	events, err := h.eventRepo.ListAccessibleByUser(currentUserID, collaboratorEventIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve events"})
		return
	}

	// Return empty array instead of null if no events
	if events == nil {
		events = []models.Event{}
	}

	// Allowlist explícito: los tokens de invitación y de Secret Box no se
	// exponen en el listado, ni siquiera para colaboradores del evento.
	c.JSON(http.StatusOK, models.NewPublicEventResponses(events))
}

// GetPublicEvent GET /api/events/:slug
// Devuelve el detalle público del evento.
//
// El evento es cargado por el EventMiddleware y queda en el contexto.
// La respuesta usa el DTO models.PublicEventResponse (allowlist explícito),
// de modo que los tokens de invitación y de Secret Box no se exponen en el
// payload del evento.
func (h *EventHandler) GetPublicEvent(c *gin.Context) {
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	eventModel, ok := event.(*models.Event)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid event data"})
		return
	}

	c.JSON(http.StatusOK, models.NewPublicEventResponse(eventModel))
}

// RegisterPublicEventRoutes registra las rutas públicas de detalle de evento.
// La respuesta nunca incluye credenciales (invite_token / secret_box_token).
func RegisterPublicEventRoutes(group *gin.RouterGroup, h *EventHandler) {
	group.GET("", h.GetPublicEvent)
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
