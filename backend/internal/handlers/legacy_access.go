package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
)

type legacyAccess struct {
	event                 func(uuid.UUID) (*models.Event, error)
	collaborators, guests middleware.CollaboratorChecker
}

// SetLegacyAccess configures record-anchored authorization without scoped context.
func (h *Handler) SetLegacyAccess(event func(uuid.UUID) (*models.Event, error), collaborators, guests middleware.CollaboratorChecker) {
	h.legacyAccess = legacyAccess{event, collaborators, guests}
}

// authorizeLegacyPlayer returns only the private upload anchor, never scoped keys.
func (h *Handler) authorizeLegacyPlayer(c *gin.Context, player *models.Player) (uuid.UUID, bool) {
	if player.EventID == uuid.Nil {
		return uuid.Nil, true
	}
	access := h.legacyAccess
	if access.event == nil || access.collaborators == nil || access.guests == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
		return uuid.Nil, false
	}
	event, err := access.event(player.EventID)
	if err != nil || event == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
		return uuid.Nil, false
	}
	if status, message := middleware.CheckEventVisibility(event, legacyViewerID(c), access.collaborators, access.guests); status != 0 {
		c.JSON(status, gin.H{"error": message})
		return uuid.Nil, false
	}
	if event.Visibility == models.EventVisibilityPrivate {
		return player.EventID, true
	}
	return uuid.Nil, true
}

// Legacy answers/submit historically defer known missing players to their repositories.
func (h *Handler) checkLegacyPlayerID(c *gin.Context, id uuid.UUID) bool {
	player, err := h.playerRepo.GetByID(id)
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
		return false
	}
	_, allowed := h.authorizeLegacyPlayer(c, player)
	return allowed
}
