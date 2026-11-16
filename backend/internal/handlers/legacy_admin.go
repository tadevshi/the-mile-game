package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// legacyAdminDeniedMessage is the answer used when the caller may not
// administer the event behind the legacy administration surface.
const legacyAdminDeniedMessage = "Not authorized. You are not the owner or a collaborator of this event"

// LegacyAdminEventLister lists the events an account may administer.
type LegacyAdminEventLister interface {
	ListAccessibleByUser(userID uuid.UUID, collaboratorEventIDs []uuid.UUID) ([]models.Event, error)
}

// LegacyAdminCollaboratorLister lists the events an account collaborates on.
type LegacyAdminCollaboratorLister interface {
	GetEventsByUser(userID uuid.UUID) ([]uuid.UUID, error)
}

// LegacyAdminScope resolves the events a caller administers on the legacy
// (non event-scoped) administration routes.
//
// Administration is limited to the events the caller owns plus the events the
// caller collaborates on. Accepted guests are not collaborators, so a guest
// never gains administrative access.
type LegacyAdminScope struct {
	events        LegacyAdminEventLister
	collaborators LegacyAdminCollaboratorLister
}

// NewLegacyAdminScope builds the legacy administration scope.
func NewLegacyAdminScope(events LegacyAdminEventLister, collaborators LegacyAdminCollaboratorLister) *LegacyAdminScope {
	return &LegacyAdminScope{
		events:        events,
		collaborators: collaborators,
	}
}

// AdministeredEvents returns the events the caller owns or collaborates on.
func (s *LegacyAdminScope) AdministeredEvents(userID uuid.UUID) ([]models.Event, error) {
	if s == nil || s.events == nil || s.collaborators == nil {
		return nil, errors.New("legacy admin scope is not configured")
	}

	collaboratorEventIDs, err := s.collaborators.GetEventsByUser(userID)
	if err != nil {
		return nil, err
	}

	return s.events.ListAccessibleByUser(userID, collaboratorEventIDs)
}

// legacyAdminEvents resolves the events the caller administers. It writes the
// denial response and returns false when the caller may not administer any
// event, so a denial always happens before any stored row is read or changed.
func (h *Handler) legacyAdminEvents(c *gin.Context) ([]models.Event, bool) {
	userID, hasIdentity := legacyCallerID(c)
	if !hasIdentity {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return nil, false
	}

	// Fail closed: without the administration scope no event can be proven to
	// be administered by the caller.
	if h.legacyAdmin == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": legacyAdminDeniedMessage})
		return nil, false
	}

	events, err := h.legacyAdmin.AdministeredEvents(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
		return nil, false
	}

	if len(events) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": legacyAdminDeniedMessage})
		return nil, false
	}

	return events, true
}

// legacySecretBoxStatus answers the legacy Secret Box status over exactly the
// events the caller administers.
func (h *Handler) legacySecretBoxStatus(c *gin.Context) {
	events, ok := h.legacyAdminEvents(c)
	if !ok {
		return
	}

	status := models.SecretBoxStatus{}
	for _, event := range events {
		eventStatus, err := h.postcardRepo.GetSecretBoxStatusByEvent(event.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get secret box status"})
			return
		}

		status.Total += eventStatus.Total
		if eventStatus.Revealed {
			status.Revealed = true
		}
		if eventStatus.RevealedAt != nil &&
			(status.RevealedAt == nil || eventStatus.RevealedAt.After(*status.RevealedAt)) {
			status.RevealedAt = eventStatus.RevealedAt
		}
	}

	c.JSON(http.StatusOK, status)
}

// legacyListSecretPostcards answers the legacy secret postcards list over
// exactly the events the caller administers.
func (h *Handler) legacyListSecretPostcards(c *gin.Context) {
	events, ok := h.legacyAdminEvents(c)
	if !ok {
		return
	}

	postcards := []models.Postcard{}
	revealed := false
	for _, event := range events {
		eventPostcards, err := h.postcardRepo.ListSecretByEvent(event.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list secret postcards"})
			return
		}

		for _, postcard := range eventPostcards {
			if postcard.RevealedAt != nil {
				revealed = true
				break
			}
		}
		postcards = append(postcards, eventPostcards...)
	}

	c.JSON(http.StatusOK, gin.H{
		"postcards": postcards,
		"total":     len(postcards),
		"revealed":  revealed,
	})
}

// legacyRevealSecretBox reveals the Secret Box of exactly the events the
// caller administers. Every other event keeps its Secret Box untouched and
// each affected event is broadcast to its own room.
func (h *Handler) legacyRevealSecretBox(c *gin.Context) {
	events, ok := h.legacyAdminEvents(c)
	if !ok {
		return
	}

	revealedPostcards := []models.Postcard{}
	for _, event := range events {
		pending, err := h.postcardRepo.ListSecretByEvent(event.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reveal secret box"})
			return
		}

		eventPostcards := pending
		pendingIDs := map[uuid.UUID]bool{}
		for _, postcard := range pending {
			if postcard.RevealedAt == nil {
				pendingIDs[postcard.ID] = true
			}
		}

		if len(pendingIDs) > 0 {
			revealed, err := h.postcardRepo.RevealSecretBoxByEvent(event.ID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reveal secret box"})
				return
			}
			eventPostcards = revealed

			newlyRevealed := []models.Postcard{}
			for _, postcard := range revealed {
				if pendingIDs[postcard.ID] {
					newlyRevealed = append(newlyRevealed, postcard)
				}
			}

			// Broadcast only the events that were actually revealed, each one
			// to its own room.
			if h.hub != nil && len(newlyRevealed) > 0 {
				h.hub.BroadcastSecretRevealToRoom(event.Slug, newlyRevealed)
			}
		}

		revealedPostcards = append(revealedPostcards, eventPostcards...)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Secret Box revealed",
		"postcards": revealedPostcards,
	})
}
