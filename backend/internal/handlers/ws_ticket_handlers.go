package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/services"
)

// WsTicketIssuer mints the WebSocket admission tickets.
type WsTicketIssuer interface {
	Issue(userID uuid.UUID, eventSlug string) (string, time.Time, error)
}

// WsEventAccessChecker reports whether an account may see an event.
type WsEventAccessChecker interface {
	CanAccessRoom(eventSlug string, userID uuid.UUID) (bool, error)
}

// WsTicketHandler issues the short-lived admission tickets that let a browser
// open a WebSocket for an event it is allowed to see.
//
// The ticket is requested over the authenticated HTTP surface, so the socket
// inherits the protection of the view: the ticket proves that the account was
// already allowed to reach that event.
type WsTicketHandler struct {
	issuer   WsTicketIssuer
	access   WsEventAccessChecker
	protocol string
}

// NewWsTicketHandler builds the ticket handler.
func NewWsTicketHandler(issuer WsTicketIssuer, access WsEventAccessChecker) *WsTicketHandler {
	return &WsTicketHandler{issuer: issuer, access: access, protocol: services.WsTicketProtocol}
}

// RegisterWsTicketRoutes registers the ticket endpoint behind the
// authentication middleware.
func RegisterWsTicketRoutes(routes *gin.RouterGroup, auth gin.HandlerFunc, handler *WsTicketHandler) {
	routes.POST("/ws/ticket", auth, handler.Issue)
}

// Issue mints a ticket for the authenticated account and the requested event.
func (h *WsTicketHandler) Issue(c *gin.Context) {
	userValue, exists := c.Get("user_id")
	userID, ok := userValue.(uuid.UUID)
	if !exists || !ok || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var request struct {
		Event string `json:"event"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || request.Event == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Event is required"})
		return
	}

	// A ticket is only minted for an event the account may reach: the
	// admission still decides at the handshake, but there is no reason to
	// hand out a credential for a room the account cannot enter.
	if h.access != nil {
		allowed, err := h.access.CanAccessRoom(request.Event, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify event access"})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view this event"})
			return
		}
	}

	ticket, expiresAt, err := h.issuer.Issue(userID, request.Event)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue websocket ticket"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"ticket":     ticket,
		"expires_at": expiresAt,
		"protocol":   h.protocol,
	})
}
