package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// GuestRepository defines persistence for non-administrative event guests.
type GuestRepository interface {
	GetOrCreateInvitation(eventID uuid.UUID) (*models.GuestInvitation, error)
	RotateInvitation(eventID uuid.UUID) (*models.GuestInvitation, error)
	AcceptInvitation(token string, userID uuid.UUID) (*models.EventGuest, error)
	ListByEvent(eventID uuid.UUID) ([]models.EventGuest, error)
	Delete(eventID, userID uuid.UUID) error
}

// GuestHandler handles account-linked guest invitations and memberships.
type GuestHandler struct {
	guestRepo GuestRepository
}

// NewGuestHandler creates a guest handler.
func NewGuestHandler(guestRepo GuestRepository) *GuestHandler {
	return &GuestHandler{guestRepo: guestRepo}
}

// GetGuestInviteToken returns the current guest-only link, creating it when necessary.
// The route must be protected by the event admin middleware.
func (h *GuestHandler) GetGuestInviteToken(c *gin.Context) {
	event, ok := eventFromGuestContext(c)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	invitation, err := h.guestRepo.GetOrCreateInvitation(event.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load guest invitation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     invitation.Token,
		"share_url": buildGuestInviteURL(event.Slug, invitation.Token),
	})
}

// RotateGuestInviteToken creates a new guest link without revoking accepted memberships.
// The route must be protected by the event admin middleware.
func (h *GuestHandler) RotateGuestInviteToken(c *gin.Context) {
	event, ok := eventFromGuestContext(c)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	invitation, err := h.guestRepo.RotateInvitation(event.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to rotate guest invitation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     invitation.Token,
		"share_url": buildGuestInviteURL(event.Slug, invitation.Token),
	})
}

// ListGuests returns account-linked guest memberships for an event administrator.
func (h *GuestHandler) ListGuests(c *gin.Context) {
	event, ok := eventFromGuestContext(c)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	guests, err := h.guestRepo.ListByEvent(event.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list guests"})
		return
	}
	if guests == nil {
		guests = []models.EventGuest{}
	}
	c.JSON(http.StatusOK, guests)
}

// RemoveGuest removes one guest membership without deleting the account or rotating the link.
func (h *GuestHandler) RemoveGuest(c *gin.Context) {
	event, ok := eventFromGuestContext(c)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	if err := h.guestRepo.Delete(event.ID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove guest"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Guest removed"})
}

// AcceptInvitation adds the authenticated account to the event for a guest-only token.
// It is intentionally separate from collaborator invitation acceptance.
func (h *GuestHandler) AcceptInvitation(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	userValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	userID, ok := userValue.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	guest, err := h.guestRepo.AcceptInvitation(token, userID)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired guest invitation"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Successfully joined event",
		"event_id": guest.EventID,
		"user_id":  guest.UserID,
	})
}

func eventFromGuestContext(c *gin.Context) (*models.Event, bool) {
	value, exists := c.Get("event")
	if !exists {
		return nil, false
	}
	event, ok := value.(*models.Event)
	return event, ok
}

func buildGuestInviteURL(slug, token string) string {
	baseURL := os.Getenv("APP_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}
	return strings.TrimRight(baseURL, "/") + "/guest-join/" + url.PathEscape(slug) + "?token=" + url.QueryEscape(token)
}
