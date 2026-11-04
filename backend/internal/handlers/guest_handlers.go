package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// GuestRepo keeps guest invitations and account membership separate from collaborators.
type GuestRepo interface {
	InviteToken(eventID uuid.UUID, regenerate bool) (string, error)
	Accept(token string, userID uuid.UUID) (*models.Guest, error)
}

type GuestEventGetter interface {
	GetByID(uuid.UUID) (*models.Event, error)
}

type GuestHandler struct {
	guests GuestRepo
	events GuestEventGetter
}

func NewGuestHandler(guests GuestRepo, events GuestEventGetter) *GuestHandler {
	return &GuestHandler{guests: guests, events: events}
}

// GetInviteToken returns the current invitation, creating it on first use (owner only).
func (h *GuestHandler) GetInviteToken(c *gin.Context) { h.invite(c, false) }

// GenerateInviteToken replaces the invitation without revoking existing memberships.
func (h *GuestHandler) GenerateInviteToken(c *gin.Context) { h.invite(c, true) }

func (h *GuestHandler) invite(c *gin.Context, regenerate bool) {
	event := c.MustGet("event").(*models.Event) // EventMiddleware + OwnerOnlyMiddleware
	token, err := h.guests.InviteToken(event.ID, regenerate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save invite token"})
		return
	}
	// Reuse the collaborator URL builder, preserving APP_BASE_URL and its fallback.
	suffix := "/join/" + event.Slug + "?token=" + token
	base := strings.TrimSuffix(buildInviteURL(event.Slug, token), suffix)
	c.JSON(http.StatusOK, gin.H{"token": token, "share_url": base + "/guest" + suffix})
}

// AcceptInvitation links the authenticated account, never a caller-supplied user ID.
func (h *GuestHandler) AcceptInvitation(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}
	guest, err := h.guests.Accept(token, userID.(uuid.UUID))
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invitation"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join event"})
		return
	}
	event, err := h.events.GetByID(guest.EventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load event"})
		return
	}
	// Explicit allowlist: never serialize Event's secret or invitation tokens.
	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully joined event",
		"event": gin.H{"id": event.ID, "slug": event.Slug, "name": event.Name},
		"user_id": guest.UserID,
	})
}
