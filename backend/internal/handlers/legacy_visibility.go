package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// EventLookup resolves an event by its identifier.
type EventLookup interface {
	GetByID(id uuid.UUID) (*models.Event, error)
}

// EventMembershipLookup reports whether an account belongs to an event.
type EventMembershipLookup interface {
	Exists(eventID, userID uuid.UUID) (bool, error)
}

// LegacyEventVisibility applies the persisted event visibility to the legacy
// (non event-scoped) HTTP routes.
//
// The policy mirrors the MR3 scoped policy: a public event is readable by
// anyone, a private event only by its owner, its collaborators and its accepted
// guests. Requests without a valid identity answer 401 and authenticated
// non-members answer 403.
type LegacyEventVisibility struct {
	events        EventLookup
	collaborators EventMembershipLookup
	guests        EventMembershipLookup
}

// NewLegacyEventVisibility builds the legacy visibility policy.
func NewLegacyEventVisibility(events EventLookup, collaborators, guests EventMembershipLookup) *LegacyEventVisibility {
	return &LegacyEventVisibility{
		events:        events,
		collaborators: collaborators,
		guests:        guests,
	}
}

// legacyVisibilityCacheKey is the gin context key of the per-request cache.
const legacyVisibilityCacheKey = "legacy_visibility_cache"

// legacyVisibilityCache memoizes event lookups and membership checks for the
// duration of a single request.
type legacyVisibilityCache struct {
	events     map[uuid.UUID]*models.Event
	membership map[string]bool
}

// visibilityDecision is the outcome of a visibility evaluation.
type visibilityDecision struct {
	allowed bool
	status  int
	message string
}

// legacyCallerID returns the caller identity set by the optional auth
// middleware. Absent, malformed or invalid tokens leave the request anonymous.
func legacyCallerID(c *gin.Context) (uuid.UUID, bool) {
	value, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	userID, ok := value.(uuid.UUID)
	if !ok || userID == uuid.Nil {
		return uuid.Nil, false
	}
	return userID, true
}

// legacyVisibilityCacheFor returns the per-request cache, creating it on first use.
func legacyVisibilityCacheFor(c *gin.Context) *legacyVisibilityCache {
	if value, exists := c.Get(legacyVisibilityCacheKey); exists {
		if cache, ok := value.(*legacyVisibilityCache); ok {
			return cache
		}
	}
	cache := &legacyVisibilityCache{
		events:     map[uuid.UUID]*models.Event{},
		membership: map[string]bool{},
	}
	c.Set(legacyVisibilityCacheKey, cache)
	return cache
}

// lookupEvent resolves an event, memoizing the result for the request.
func (v *LegacyEventVisibility) lookupEvent(c *gin.Context, eventID uuid.UUID) (*models.Event, error) {
	cache := legacyVisibilityCacheFor(c)
	if event, ok := cache.events[eventID]; ok {
		return event, nil
	}
	event, err := v.events.GetByID(eventID)
	if err != nil {
		return nil, err
	}
	cache.events[eventID] = event
	return event, nil
}

// isMember reports whether the caller belongs to the event as collaborator or
// accepted guest, memoizing the result for the request.
func (v *LegacyEventVisibility) isMember(c *gin.Context, eventID, userID uuid.UUID) (bool, error) {
	cache := legacyVisibilityCacheFor(c)
	key := eventID.String() + "|" + userID.String()
	if member, ok := cache.membership[key]; ok {
		return member, nil
	}

	member := false
	if v.collaborators != nil {
		isCollaborator, err := v.collaborators.Exists(eventID, userID)
		if err != nil {
			return false, err
		}
		member = isCollaborator
	}
	if !member && v.guests != nil {
		isGuest, err := v.guests.Exists(eventID, userID)
		if err != nil {
			return false, err
		}
		member = isGuest
	}

	cache.membership[key] = member
	return member, nil
}

// legacyDeniedDecision is the fail-closed answer used when the visibility of an
// event cannot be established.
func legacyDeniedDecision(hasIdentity bool) visibilityDecision {
	if hasIdentity {
		return visibilityDecision{status: http.StatusForbidden, message: "Not authorized to view this event"}
	}
	return visibilityDecision{status: http.StatusUnauthorized, message: "Authentication required"}
}

// legacyVisibility evaluates whether the caller may see content of the event.
func (h *Handler) legacyVisibility(c *gin.Context, eventID uuid.UUID) visibilityDecision {
	// Legacy data that belongs to no event keeps its current behavior.
	if eventID == uuid.Nil {
		return visibilityDecision{allowed: true}
	}

	userID, hasIdentity := legacyCallerID(c)

	// Fail closed: without the visibility dependency no event content can be
	// proven to be public, so it is not served.
	if h.visibility == nil || h.visibility.events == nil {
		return legacyDeniedDecision(hasIdentity)
	}

	event, err := h.visibility.lookupEvent(c, eventID)
	if err != nil {
		if errors.Is(err, repository.ErrEventNotFound) || errors.Is(err, sql.ErrNoRows) {
			return legacyDeniedDecision(hasIdentity)
		}
		return visibilityDecision{status: http.StatusInternalServerError, message: "Failed to verify event access"}
	}

	if event.IsPublic {
		return visibilityDecision{allowed: true}
	}

	if !hasIdentity {
		return visibilityDecision{status: http.StatusUnauthorized, message: "Authentication required"}
	}

	if userID == event.OwnerID {
		return visibilityDecision{allowed: true}
	}

	isMember, err := h.visibility.isMember(c, eventID, userID)
	if err != nil {
		return visibilityDecision{status: http.StatusInternalServerError, message: "Failed to verify event access"}
	}
	if isMember {
		return visibilityDecision{allowed: true}
	}

	return visibilityDecision{status: http.StatusForbidden, message: "Not authorized to view this event"}
}

// requireLegacyEventAccess enforces the visibility policy on a legacy route.
// It writes the error response and returns false when access is denied.
func (h *Handler) requireLegacyEventAccess(c *gin.Context, eventID uuid.UUID) bool {
	decision := h.legacyVisibility(c, eventID)
	if decision.allowed {
		return true
	}
	c.JSON(decision.status, gin.H{"error": decision.message})
	return false
}

// legacyVisibleFlags reports, for every given event, whether the caller may see
// its content. A non-nil failure means the check could not be completed.
func (h *Handler) legacyVisibleFlags(c *gin.Context, eventIDs []uuid.UUID) ([]bool, *visibilityDecision) {
	flags := make([]bool, len(eventIDs))
	for i, eventID := range eventIDs {
		decision := h.legacyVisibility(c, eventID)
		if decision.allowed {
			flags[i] = true
			continue
		}
		if decision.status == http.StatusInternalServerError {
			return nil, &decision
		}
		flags[i] = false
	}
	return flags, nil
}
