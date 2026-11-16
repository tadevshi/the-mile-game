package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	gorilla "github.com/gorilla/websocket"
	"github.com/the-mile-game/backend/internal/services"
)

// TicketValidator validates the short-lived admission tickets of the sockets.
type TicketValidator interface {
	Validate(token string) (*services.WsTicket, error)
}

// RoomAdmissionPolicy decides whether an identity may enter a room. The
// decision lives in the services package; the interface keeps the hub
// injectable.
type RoomAdmissionPolicy interface {
	AdmitRoom(eventSlug string, userID uuid.UUID) (services.WsAdmission, error)
}

// ticketFromRequest extracts the admission ticket from the offered
// subprotocols: the browser cannot set an Authorization header on a socket.
func ticketFromRequest(r *http.Request) (string, bool) {
	for _, protocol := range gorilla.Subprotocols(r) {
		if token := strings.TrimPrefix(protocol, services.WsTicketPrefix); token != protocol && token != "" {
			return token, true
		}
	}
	return "", false
}

// writeAdmissionError answers the client before the upgrade with a JSON body.
func writeAdmissionError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// admit resolves the identity of the client and applies the room policy. It
// writes the refusal answer and returns false when the client may not join.
func (h *Hub) admit(w http.ResponseWriter, r *http.Request, eventSlug string) bool {
	userID := uuid.Nil
	if token, ok := ticketFromRequest(r); ok && h.tickets != nil {
		if ticket, err := h.tickets.Validate(token); err == nil {
			// The ticket is bound to one event: it never opens another room.
			if ticket.EventSlug != eventSlug {
				writeAdmissionError(w, http.StatusForbidden, "Not authorized to view this event")
				return false
			}
			userID = ticket.UserID
		}
		// A ticket that does not validate leaves the client anonymous
	}
	admission, err := h.admission.AdmitRoom(eventSlug, userID)
	if err != nil {
		log.Printf("WebSocket: Fallo al verificar el acceso al evento '%s': %v", eventSlug, err)
		writeAdmissionError(w, http.StatusInternalServerError, "Failed to verify event access")
		return false
	}
	switch admission {
	case services.WsAdmissionGranted:
		return true
	case services.WsAdmissionIdentityRequired:
		writeAdmissionError(w, http.StatusUnauthorized, "Authentication required")
	default:
		writeAdmissionError(w, http.StatusForbidden, "Not authorized to view this event")
	}
	return false
}
