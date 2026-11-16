package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type fakeWsTicketIssuer struct {
	ticket string
	err    error
	issued []string
}

func (f *fakeWsTicketIssuer) Issue(userID uuid.UUID, eventSlug string) (string, time.Time, error) {
	f.issued = append(f.issued, eventSlug)
	if f.err != nil {
		return "", time.Time{}, f.err
	}
	return f.ticket, time.Now().Add(time.Minute), nil
}

type fakeWsEventAccess struct {
	allowed map[string]bool
	err     error
}

func (f *fakeWsEventAccess) CanAccessRoom(eventSlug string, userID uuid.UUID) (bool, error) {
	if f.err != nil {
		return false, f.err
	}
	return f.allowed[eventSlug], nil
}

func serveWsTicketRequest(t *testing.T, handler *WsTicketHandler, body string, userID uuid.UUID) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/ws/ticket", func(c *gin.Context) {
		if userID != uuid.Nil {
			c.Set("user_id", userID)
		}
		handler.Issue(c)
	})

	request := httptest.NewRequest(http.MethodPost, "/api/ws/ticket", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestWsTicketHandlerIssuesTicketForReachableEvent(t *testing.T) {
	issuer := &fakeWsTicketIssuer{ticket: "signed-ticket"}
	access := &fakeWsEventAccess{allowed: map[string]bool{"public-event": true}}
	handler := NewWsTicketHandler(issuer, access)

	response := serveWsTicketRequest(t, handler, `{"event":"public-event"}`, uuid.New())
	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "signed-ticket") {
		t.Fatalf("body = %s, want the issued ticket", response.Body.String())
	}
	if len(issuer.issued) != 1 || issuer.issued[0] != "public-event" {
		t.Fatalf("issued events = %v, want [public-event]", issuer.issued)
	}
}

func TestWsTicketHandlerRefusesUnreachableEvent(t *testing.T) {
	issuer := &fakeWsTicketIssuer{ticket: "signed-ticket"}
	access := &fakeWsEventAccess{allowed: map[string]bool{"public-event": true}}
	handler := NewWsTicketHandler(issuer, access)

	response := serveWsTicketRequest(t, handler, `{"event":"private-event"}`, uuid.New())
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body=%s", response.Code, response.Body.String())
	}
	if len(issuer.issued) != 0 {
		t.Fatalf("issued events = %v, want no ticket", issuer.issued)
	}
}

func TestWsTicketHandlerRequiresIdentityAndEvent(t *testing.T) {
	issuer := &fakeWsTicketIssuer{ticket: "signed-ticket"}
	access := &fakeWsEventAccess{allowed: map[string]bool{"public-event": true}}
	handler := NewWsTicketHandler(issuer, access)

	anonymous := serveWsTicketRequest(t, handler, `{"event":"public-event"}`, uuid.Nil)
	if anonymous.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous status = %d, want 401; body=%s", anonymous.Code, anonymous.Body.String())
	}

	missingEvent := serveWsTicketRequest(t, handler, `{}`, uuid.New())
	if missingEvent.Code != http.StatusBadRequest {
		t.Fatalf("missing event status = %d, want 400; body=%s", missingEvent.Code, missingEvent.Body.String())
	}

	if len(issuer.issued) != 0 {
		t.Fatalf("issued events = %v, want no ticket", issuer.issued)
	}
}
