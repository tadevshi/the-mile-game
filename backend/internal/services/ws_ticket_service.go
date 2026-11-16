package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// WsTicketTTL is how long a WebSocket admission ticket stays valid. The
// ticket is minted right before the browser opens the socket, so a short
// lifetime is enough and keeps a leaked ticket from being reusable.
const WsTicketTTL = 60 * time.Second

// WsTicketProtocol is the WebSocket subprotocol the server negotiates.
const WsTicketProtocol = "eventhub.v1"

// WsTicketPrefix marks the subprotocol that carries an admission ticket.
const WsTicketPrefix = "ticket."

// Errors returned when a WebSocket admission ticket cannot be used.
var (
	// ErrWsTicketInvalid means the ticket is malformed or its signature does
	// not match.
	ErrWsTicketInvalid = errors.New("invalid websocket ticket")
	// ErrWsTicketExpired means the ticket was minted too long ago.
	ErrWsTicketExpired = errors.New("expired websocket ticket")
)

// WsTicket is the admission ticket payload.
type WsTicket struct {
	UserID    uuid.UUID `json:"uid"`
	EventSlug string    `json:"ev"`
	ExpiresAt time.Time `json:"exp"`
}

// WsTicketService issues and validates the short-lived tickets that let a
// browser open a WebSocket for an event it is allowed to see.
//
// The ticket is a signed value, not a stored session: it never leaves the
// server as a database lookup, it is bound to the account and the event, and
// it expires quickly. It is not an API token and must not be used as one.
type WsTicketService struct {
	secret []byte
	ttl    time.Duration
}

// NewWsTicketService builds the ticket service. The secret is derived from the
// configured application secret with a domain separation prefix, so a ticket
// can never be confused with an API token.
func NewWsTicketService(secret string) *WsTicketService {
	return &WsTicketService{
		secret: []byte("ws-ticket:" + secret),
		ttl:    WsTicketTTL,
	}
}

// Issue mints a ticket for an account and an event.
func (s *WsTicketService) Issue(userID uuid.UUID, eventSlug string) (string, time.Time, error) {
	expiresAt := time.Now().UTC().Add(s.ttl)

	payload, err := json.Marshal(WsTicket{
		UserID:    userID,
		EventSlug: eventSlug,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return "", time.Time{}, err
	}

	encoded := base64.RawURLEncoding.EncodeToString(payload)
	return encoded + "." + base64.RawURLEncoding.EncodeToString(s.sign(encoded)), expiresAt, nil
}

// Validate checks the signature and the lifetime of a ticket.
func (s *WsTicketService) Validate(token string) (*WsTicket, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, ErrWsTicketInvalid
	}

	signature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrWsTicketInvalid
	}
	if !hmac.Equal(signature, s.sign(parts[0])) {
		return nil, ErrWsTicketInvalid
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrWsTicketInvalid
	}

	var ticket WsTicket
	if err := json.Unmarshal(payload, &ticket); err != nil {
		return nil, ErrWsTicketInvalid
	}
	if ticket.UserID == uuid.Nil || ticket.EventSlug == "" {
		return nil, ErrWsTicketInvalid
	}
	if time.Now().UTC().After(ticket.ExpiresAt) {
		return nil, ErrWsTicketExpired
	}

	return &ticket, nil
}

// sign returns the signature of an encoded payload.
func (s *WsTicketService) sign(payload string) []byte {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return mac.Sum(nil)
}
