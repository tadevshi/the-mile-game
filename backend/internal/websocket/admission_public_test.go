package websocket

import "testing"

// A ticket is minted for one event, but a public room stays open to everyone:
// a mismatched ticket must not close a room that an anonymous client may
// enter. The same ticket still does not open a private room.
func TestWebSocketAdmission_ForeignTicketKeepsPublicRoomOpen(t *testing.T) {
	f := newWSFixture(t)
	defer f.server.Close()

	conn, resp, err := f.dial(t, "?event="+f.publicSlug, ticketProtocols(t, f, f.owner, f.privateSlug))
	if err != nil {
		t.Fatalf("dial public room with a foreign ticket: err = %v, response = %v", err, resp)
	}
	if resp == nil || resp.StatusCode != 101 {
		t.Fatalf("public room status = %v, want 101", resp)
	}
	conn.Close()
}
