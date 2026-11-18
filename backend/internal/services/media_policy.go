package services

import (
	"errors"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/repository"
)

// MediaDecision is the outcome of the media access decision.
type MediaDecision int

const (
	MediaAllowed      MediaDecision = iota // the caller may read the media
	MediaNotFound                          // the media does not exist
	MediaGone                              // the event that owns the media ended
	MediaUnauthorized                      // the caller needs a valid identity
	MediaForbidden                         // the identity is not a member of the event
	MediaFailed                            // the event access could not be verified
)

// The cache handling is coupled to the decision: the media of a public event
// stays publicly cacheable and the media of a private event is not storable.
const (
	MediaCachePublic  = "public, max-age=2592000"
	MediaCachePrivate = "private, no-store"
)

// MediaPolicy applies the persisted event visibility to a stored media file,
// with the same rules as the scoped HTTP route and the WebSocket room policy:
// a public event is readable by anyone, a private event only by its owner, its
// collaborators and its accepted guests, and the records that belong to no event
// keep their current behavior.
type MediaPolicy struct {
	events        *repository.EventRepository
	collaborators *repository.CollaboratorRepository
	guests        *repository.GuestRepository
}

// NewMediaPolicy builds the media access policy.
func NewMediaPolicy(events *repository.EventRepository, collaborators *repository.CollaboratorRepository, guests *repository.GuestRepository) *MediaPolicy {
	return &MediaPolicy{events: events, collaborators: collaborators, guests: guests}
}

// DecideAll reports whether the caller may read the media and how the response
// may be cached, for every stored record that references the path. The
// decision is the strictest one: when a path is referenced by more than one
// record, the media is only served when the caller may read all of them, so a
// shared path can never disclose the content of a private event.
func (p *MediaPolicy) DecideAll(records []*repository.MediaRecord, userID uuid.UUID) (MediaDecision, string) {
	if len(records) == 0 {
		return MediaNotFound, ""
	}

	decision := MediaAllowed
	private := false
	for _, record := range records {
		recordDecision, recordCache := p.Decide(record, userID)
		if mediaDecisionSeverity(recordDecision) > mediaDecisionSeverity(decision) {
			decision = recordDecision
		}
		if recordCache == MediaCachePrivate {
			private = true
		}
	}
	if decision != MediaAllowed {
		return decision, ""
	}
	if private {
		return decision, MediaCachePrivate
	}
	return decision, MediaCachePublic
}

// mediaDecisionSeverity orders the decisions from the most restrictive one:
// a failure, then a refusal, then the missing identity, then the ended
// event, and finally the absence of the record.
func mediaDecisionSeverity(decision MediaDecision) int {
	switch decision {
	case MediaFailed:
		return 5
	case MediaForbidden:
		return 4
	case MediaUnauthorized:
		return 3
	case MediaGone:
		return 2
	case MediaNotFound:
		return 1
	default:
		return 0
	}
}

// Decide reports whether the caller may read the media and how the response
// may be cached. userID is uuid.Nil when the caller presented no valid identity.
func (p *MediaPolicy) Decide(record *repository.MediaRecord, userID uuid.UUID) (MediaDecision, string) {
	if record == nil {
		return MediaNotFound, ""
	}

	// The media that belongs to no event keeps its current behavior.
	if record.EventID == nil || *record.EventID == uuid.Nil {
		return MediaAllowed, MediaCachePublic
	}

	event, err := p.events.GetByID(*record.EventID)
	if err != nil {
		if errors.Is(err, repository.ErrEventNotFound) {
			return MediaNotFound, ""
		}
		return MediaFailed, ""
	}

	// An event that ended answers 410 over the scoped HTTP route.
	if !event.IsActive {
		return MediaGone, ""
	}

	if event.IsPublic {
		return MediaAllowed, MediaCachePublic
	}

	if userID == uuid.Nil {
		return MediaUnauthorized, ""
	}
	if userID == event.OwnerID {
		return MediaAllowed, MediaCachePrivate
	}

	isCollaborator, err := p.collaborators.Exists(event.ID, userID)
	if err != nil {
		return MediaFailed, ""
	}
	if isCollaborator {
		return MediaAllowed, MediaCachePrivate
	}

	isGuest, err := p.guests.Exists(event.ID, userID)
	if err != nil {
		return MediaFailed, ""
	}
	if isGuest {
		return MediaAllowed, MediaCachePrivate
	}

	return MediaForbidden, ""
}
