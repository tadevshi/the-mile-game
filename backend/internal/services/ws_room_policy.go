package services

import (
	"errors"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/repository"
)

// WsAdmission is the outcome of the WebSocket room admission check.
type WsAdmission int

const (
	WsAdmissionGranted          WsAdmission = iota // the identity is a member of the private event
	WsAdmissionPublicRoom                          // the event is public: anyone may join
	WsAdmissionIdentityRequired                    // the room needs an identity the client could not present
	WsAdmissionForbidden                           // the identity is not allowed in that room
)

// WsRoomPolicy applies the persisted event visibility to a WebSocket room: a
// public event is open to anyone, and a private event only to its owner, its
// collaborators and its accepted guests.
type WsRoomPolicy struct {
	events        *repository.EventRepository
	collaborators *repository.CollaboratorRepository
	guests        *repository.GuestRepository
}

// NewWsRoomPolicy builds the room admission policy.
func NewWsRoomPolicy(events *repository.EventRepository, collaborators *repository.CollaboratorRepository, guests *repository.GuestRepository) *WsRoomPolicy {
	return &WsRoomPolicy{events: events, collaborators: collaborators, guests: guests}
}

// CanAccessRoom reports whether the account may see the event at all. It is
// used to refuse a ticket for an event the account cannot reach, so the
// ticket is only ever minted for a room the account may enter.
func (p *WsRoomPolicy) CanAccessRoom(eventSlug string, userID uuid.UUID) (bool, error) {
	admission, err := p.AdmitRoom(eventSlug, userID)
	if err != nil {
		return false, err
	}
	return admission == WsAdmissionGranted || admission == WsAdmissionPublicRoom, nil
}

// CanAnonymousViewEvent reports whether the content of an event may be seen by
// a client without an identity. The records that belong to no event keep their
// current behavior, so they stay visible.
func (p *WsRoomPolicy) CanAnonymousViewEvent(eventID uuid.UUID) (bool, error) {
	if eventID == uuid.Nil {
		return true, nil
	}

	event, err := p.events.GetByID(eventID)
	if err != nil {
		if errors.Is(err, repository.ErrEventNotFound) {
			return false, nil
		}
		return false, err
	}

	// An event that already ended answers 410 over HTTP, so its content is not
	// readable either: the same rule applies to the global payloads.
	return event.IsPublic && event.IsActive, nil
}

// AdmitRoom reports whether the identity may join the room. userID is
// uuid.Nil when the client presented no valid ticket.
func (p *WsRoomPolicy) AdmitRoom(eventSlug string, userID uuid.UUID) (WsAdmission, error) {
	event, err := p.events.GetBySlug(eventSlug)
	if err != nil {
		if errors.Is(err, repository.ErrEventNotFound) {
			return WsAdmissionForbidden, nil
		}
		return WsAdmissionForbidden, err
	}
	if event.IsPublic {
		return WsAdmissionPublicRoom, nil
	}
	if userID == uuid.Nil {
		return WsAdmissionIdentityRequired, nil
	}
	if userID == event.OwnerID {
		return WsAdmissionGranted, nil
	}
	isCollaborator, err := p.collaborators.Exists(event.ID, userID)
	if err != nil {
		return WsAdmissionForbidden, err
	}
	if isCollaborator {
		return WsAdmissionGranted, nil
	}
	isGuest, err := p.guests.Exists(event.ID, userID)
	if err != nil {
		return WsAdmissionForbidden, err
	}
	if isGuest {
		return WsAdmissionGranted, nil
	}
	return WsAdmissionForbidden, nil
}
