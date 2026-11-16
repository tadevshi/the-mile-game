package websocket

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"

	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

const wsTestSecret = "ws-admission-test-secret"

// wsFixture holds the disposable database fixtures and the hub under test.
type wsFixture struct {
	ownerT                               *testing.T
	hub                                  *Hub
	server                               *httptest.Server
	tickets                              *services.WsTicketService
	publicSlug, otherSlug, privateSlug   string
	owner, collaborator, guest, outsider uuid.UUID
}

// wsTicketValidator validates the real tickets and expires one token.
type wsTicketValidator struct{ real *services.WsTicketService }

func (v wsTicketValidator) Validate(token string) (*services.WsTicket, error) {
	if token == "expired" {
		return nil, services.ErrWsTicketExpired
	}
	return v.real.Validate(token)
}

// must fails the test when the operation failed.
func must(t *testing.T, err error, what string) {
	t.Helper()
	if err != nil {
		t.Fatalf("%s: %v", what, err)
	}
}
func newWSFixture(t *testing.T) *wsFixture {
	t.Helper()
	db := openWSTestDB(t)
	events, collabs, guests := repository.NewEventRepository(db), repository.NewCollaboratorRepository(db), repository.NewGuestRepository(db)
	f := &wsFixture{ownerT: t, tickets: services.NewWsTicketService(wsTestSecret)}
	f.owner, f.collaborator, f.guest, f.outsider = createWSUser(t, db), createWSUser(t, db), createWSUser(t, db), createWSUser(t, db)
	f.publicSlug, f.privateSlug = createWSEvent(t, db, events, f.owner, true), createWSEvent(t, db, events, f.owner, false)
	event, err := events.GetBySlug(f.privateSlug)
	must(t, err, "get private event")
	_, err = collabs.Create(event.ID, f.collaborator)
	must(t, err, "create collaborator")
	invitation, err := guests.GetOrCreateInvitation(event.ID)
	must(t, err, "create guest invitation")
	_, err = guests.AcceptInvitation(invitation.Token, f.guest)
	must(t, err, "accept guest invitation")
	validator := &mockEventValidator{validEvents: map[string]bool{f.publicSlug: true, f.privateSlug: true}}
	f.hub = NewHubWithAdmission(validator, wsTicketValidator{f.tickets}, services.NewWsRoomPolicy(events, collabs, guests))
	go f.hub.Run()
	f.server = httptest.NewServer(http.HandlerFunc(f.hub.ServeHTTP))
	t.Cleanup(f.server.Close)
	return f
}

// openWSTestDB connects to the disposable PostgreSQL used by the tests.
func openWSTestDB(t *testing.T) *sql.DB {
	t.Helper()
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("TEST_DB_HOST"), os.Getenv("TEST_DB_PORT"), os.Getenv("TEST_DB_USER"),
		os.Getenv("TEST_DB_PASSWORD"), os.Getenv("TEST_DB_NAME"))
	db, err := sql.Open("postgres", connStr)
	must(t, err, "open test database")
	must(t, db.Ping(), "ping test database")
	t.Cleanup(func() { db.Close() })
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM events WHERE slug LIKE 'ws-test-%'`)
		_, _ = db.Exec(`DELETE FROM users WHERE email LIKE 'ws-test-%@example.com'`)
	})
	return db
}

// createWSUser creates a user that can be a member of an event.
func createWSUser(t *testing.T, db *sql.DB) uuid.UUID {
	t.Helper()
	id := uuid.New()
	_, err := db.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
		id, "ws-test-"+id.String()+"@example.com", "hash", "WS Test User")
	must(t, err, "create test user")
	return id
}

// createWSEvent creates an event with the requested visibility.
func createWSEvent(t *testing.T, db *sql.DB, repo *repository.EventRepository, owner uuid.UUID, isPublic bool) string {
	t.Helper()
	slug := "ws-test-" + uuid.NewString()[:8]
	event, err := repo.Create(owner, slug, "WS test event", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
	must(t, err, "create test event")
	if !isPublic {
		_, err = db.Exec(`UPDATE events SET is_public = FALSE WHERE id = $1`, event.ID)
		must(t, err, "make event private")
	}
	return slug
}

// dial opens a real WebSocket connection against the hub.
func (f *wsFixture) dial(t *testing.T, query string, protocols []string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	url := "ws" + strings.TrimPrefix(f.server.URL, "http") + "/ws" + query
	dialer := websocket.Dialer{Subprotocols: protocols, HandshakeTimeout: 5 * time.Second}
	return dialer.Dial(url, nil)
}

// ticketProtocols builds the subprotocols that carry an admission ticket.
func ticketProtocols(t *testing.T, f *wsFixture, userID uuid.UUID, slug string) []string {
	t.Helper()
	ticket, _, err := f.tickets.Issue(userID, slug)
	must(t, err, "issue ticket")
	return []string{services.WsTicketProtocol, services.WsTicketPrefix + ticket}
}

// assertRefusal checks the answer the client receives before the upgrade.
func assertRefusal(t *testing.T, resp *http.Response, wantStatus int, wantMessage string) {
	t.Helper()
	if resp == nil {
		t.Fatal("expected an HTTP refusal, got no response")
	}
	defer resp.Body.Close()
	if resp.StatusCode != wantStatus {
		t.Fatalf("status = %d, want %d", resp.StatusCode, wantStatus)
	}
	if wantMessage == "" {
		return
	}
	var body map[string]string
	must(t, json.NewDecoder(resp.Body).Decode(&body), "decode refusal body")
	if body["error"] != wantMessage {
		t.Fatalf("error = %q, want %q", body["error"], wantMessage)
	}
}

// waitClients waits until the hub registered the expected clients.
func waitClients(t *testing.T, hub *Hub, want int) {
	t.Helper()
	for i := 0; i < 300 && hub.GetClientCount() < want; i++ {
		time.Sleep(10 * time.Millisecond)
	}
	if hub.GetClientCount() < want {
		t.Fatalf("timeout waiting for %d clients, got %d", want, hub.GetClientCount())
	}
}

func testRanking() []models.RankingEntry {
	return []models.RankingEntry{{
		Position: 1,
		Player:   models.Player{ID: uuid.New(), Name: "Player", Avatar: "👤", Score: 10},
	}}
}

// readMessage reads one frame from the connection.
func readMessage(conn *websocket.Conn, timeout time.Duration) (string, error) {
	conn.SetReadDeadline(time.Now().Add(timeout))
	_, data, err := conn.ReadMessage()
	return string(data), err
}

// assertRankingMessage checks that the frame carries a ranking update.
func assertRankingMessage(t *testing.T, conn *websocket.Conn, timeout time.Duration) {
	t.Helper()
	data, err := readMessage(conn, timeout)
	if err != nil {
		t.Fatalf("read message: %v", err)
	}
	if !strings.Contains(data, `"ranking_update"`) {
		t.Fatalf("unexpected message: %s", data)
	}
}

// assertNoMessage checks that the connection receives nothing.
func assertNoMessage(t *testing.T, conn *websocket.Conn, what string) {
	t.Helper()
	if data, err := readMessage(conn, 300*time.Millisecond); err == nil {
		t.Fatalf("%s received a message it must not receive: %s", what, data)
	}
}

func TestWebSocketAdmission_RefusedClients(t *testing.T) {
	f := newWSFixture(t)
	cases := []struct {
		name       string
		slug       string
		protocols  []string
		wantStatus int
		wantError  string
	}{
		{"anonymous client of a private room", f.privateSlug, nil, http.StatusUnauthorized, "Authentication required"},
		{"non member of a private room", f.privateSlug, ticketProtocols(t, f, f.outsider, f.privateSlug), http.StatusForbidden, "Not authorized to view this event"},
		{"ticket of another event", f.privateSlug, ticketProtocols(t, f, f.owner, f.publicSlug), http.StatusForbidden, "Not authorized to view this event"},
		{"tampered ticket", f.privateSlug, []string{services.WsTicketProtocol, services.WsTicketPrefix + "tampered"}, http.StatusUnauthorized, "Authentication required"},
		{"expired ticket", f.privateSlug, []string{services.WsTicketProtocol, services.WsTicketPrefix + "expired"}, http.StatusUnauthorized, "Authentication required"},
		{"unknown event", "ws-test-unknown", nil, http.StatusNotFound, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			conn, resp, err := f.dial(t, "?event="+tc.slug, tc.protocols)
			if err == nil {
				conn.Close()
				t.Fatal("expected the client to be refused")
			}
			assertRefusal(t, resp, tc.wantStatus, tc.wantError)
		})
	}
}

func TestWebSocketAdmission_AdmittedClients(t *testing.T) {
	f := newWSFixture(t)
	cases := []struct {
		name   string
		userID uuid.UUID
		slug   string
	}{
		{"anonymous client of a public room", uuid.Nil, f.publicSlug},
		{"owner of a private room", f.owner, f.privateSlug},
		{"collaborator of a private room", f.collaborator, f.privateSlug},
		{"guest of a private room", f.guest, f.privateSlug},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var protocols []string
			if tc.userID != uuid.Nil {
				protocols = ticketProtocols(t, f, tc.userID, tc.slug)
			}
			before := f.hub.GetClientCount()
			conn, _, err := f.dial(t, "?event="+tc.slug, protocols)
			must(t, err, "dial room")
			f.ownerT.Cleanup(func() { conn.Close() })
			waitClients(t, f.hub, before+1)
			f.hub.BroadcastRankingToRoom(tc.slug, testRanking())
			assertRankingMessage(t, conn, 2*time.Second)
		})
	}
}

func TestWebSocketDelivery_PerRoomGuarantee(t *testing.T) {
	f := newWSFixture(t)
	before := f.hub.GetClientCount()
	roomConn, _, err := f.dial(t, "?event="+f.publicSlug, nil)
	must(t, err, "dial room")
	f.ownerT.Cleanup(func() { roomConn.Close() })
	observerConn, _, err := f.dial(t, "?event=", nil)
	must(t, err, "dial observer")
	f.ownerT.Cleanup(func() { observerConn.Close() })
	waitClients(t, f.hub, before+2)

	// El mensaje del room llega a los clientes de ese room
	f.hub.BroadcastRankingToRoom(f.publicSlug, testRanking())
	assertRankingMessage(t, roomConn, 2*time.Second)

	// El broadcast global llega solo al observer sin room
	f.hub.BroadcastRanking(testRanking())
	assertRankingMessage(t, observerConn, 2*time.Second)

	// Un broadcast de room sin slug no llega a nadie
	f.hub.BroadcastRankingToRoom("", testRanking())
	assertNoMessage(t, roomConn, "the room client")
	assertNoMessage(t, observerConn, "the observer")
}
