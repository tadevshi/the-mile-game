package services

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestWsTicketServiceIssueAndValidate(t *testing.T) {
	service := NewWsTicketService("test-secret")
	userID := uuid.New()
	eventSlug := "ticket-event"

	ticket, expiresAt, err := service.Issue(userID, eventSlug)
	if err != nil {
		t.Fatalf("issue error = %v", err)
	}
	if ticket == "" {
		t.Fatalf("issue returned an empty ticket")
	}
	if !expiresAt.After(time.Now()) {
		t.Fatalf("issue expiry %s is not in the future", expiresAt)
	}

	validated, err := service.Validate(ticket)
	if err != nil {
		t.Fatalf("validate error = %v", err)
	}
	if validated.UserID != userID {
		t.Fatalf("validated user = %s, want %s", validated.UserID, userID)
	}
	if validated.EventSlug != eventSlug {
		t.Fatalf("validated event = %q, want %q", validated.EventSlug, eventSlug)
	}
}

func TestWsTicketServiceRejectsTamperedTicket(t *testing.T) {
	service := NewWsTicketService("test-secret")
	ticket, _, err := service.Issue(uuid.New(), "ticket-event")
	if err != nil {
		t.Fatalf("issue error = %v", err)
	}

	tampered := ticket[:len(ticket)-1] + "X"
	if _, err := service.Validate(tampered); !errors.Is(err, ErrWsTicketInvalid) {
		t.Fatalf("tampered ticket error = %v, want %v", err, ErrWsTicketInvalid)
	}

	other := NewWsTicketService("another-secret")
	if _, err := other.Validate(ticket); !errors.Is(err, ErrWsTicketInvalid) {
		t.Fatalf("ticket of another secret error = %v, want %v", err, ErrWsTicketInvalid)
	}

	for _, malformed := range []string{"", "no-dot", "a.b.c", "...."} {
		if _, err := service.Validate(malformed); !errors.Is(err, ErrWsTicketInvalid) {
			t.Fatalf("malformed ticket %q error = %v, want %v", malformed, err, ErrWsTicketInvalid)
		}
	}
}

func TestWsTicketServiceRejectsExpiredTicket(t *testing.T) {
	service := NewWsTicketService("test-secret")
	ticket, _, err := service.Issue(uuid.New(), "ticket-event")
	if err != nil {
		t.Fatalf("issue error = %v", err)
	}

	// The ticket is only valid for a minute; an expired one must not be usable.
	service.ttl = -time.Second
	expired, _, err := service.Issue(uuid.New(), "ticket-event")
	if err != nil {
		t.Fatalf("issue error = %v", err)
	}

	if _, err := service.Validate(expired); !errors.Is(err, ErrWsTicketExpired) {
		t.Fatalf("expired ticket error = %v, want %v", err, ErrWsTicketExpired)
	}
	if _, err := service.Validate(ticket); err != nil {
		t.Fatalf("fresh ticket error = %v", err)
	}
}
