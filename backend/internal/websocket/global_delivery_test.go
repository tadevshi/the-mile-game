package websocket

import (
	"database/sql"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/the-mile-game/backend/internal/models"
)

// The global broadcasts reach the connections without a room. Their payload
// must carry only what a client without an identity may see: the public events
// and the data that belongs to no event.
func TestWebSocketGlobalBroadcasts_HidePrivateEventRows(t *testing.T) {
	f := newWSFixture(t)

	db := openWSTestDB(t)
	publicID := eventIDOf(t, db, f.publicSlug)
	privateID := eventIDOf(t, db, f.privateSlug)

	observer, _, err := f.dial(t, "", nil)
	must(t, err, "dial observer")
	defer observer.Close()
	waitClients(t, f.hub, 1)

	publicPlayer := models.Player{ID: uuid.New(), EventID: publicID, Name: "Public Player"}
	privatePlayer := models.Player{ID: uuid.New(), EventID: privateID, Name: "Private Player"}
	eventlessPlayer := models.Player{ID: uuid.New(), EventID: uuid.Nil, Name: "Eventless Player"}

	f.hub.BroadcastRanking([]models.RankingEntry{
		{Position: 1, Player: publicPlayer},
		{Position: 2, Player: privatePlayer},
		{Position: 3, Player: eventlessPlayer},
	})

	message, err := readMessage(observer, 2*time.Second)
	must(t, err, "read ranking message")
	if containsPlayerName(message, privatePlayer.Name) {
		t.Fatalf("global ranking exposed a private-event player: %s", message)
	}
	if !containsPlayerName(message, publicPlayer.Name) {
		t.Fatalf("global ranking dropped a public-event player: %s", message)
	}
	if !containsPlayerName(message, eventlessPlayer.Name) {
		t.Fatalf("global ranking dropped an eventless player: %s", message)
	}
}

// A postcard of a private event must not reach an observer, while a postcard
// of a public event does.
func TestWebSocketGlobalBroadcasts_HidePrivateEventPostcards(t *testing.T) {
	f := newWSFixture(t)

	db := openWSTestDB(t)
	publicID := eventIDOf(t, db, f.publicSlug)
	privateID := eventIDOf(t, db, f.privateSlug)

	observer, _, err := f.dial(t, "", nil)
	must(t, err, "dial observer")
	defer observer.Close()
	waitClients(t, f.hub, 1)

	f.hub.BroadcastPostcard(models.Postcard{ID: uuid.New(), EventID: privateID, Message: "private postcard"})
	assertNoMessage(t, observer, "a postcard of a private event reached an observer")

	// A second connection receives the public postcard: a read that times out
	// leaves the first connection unusable.
	second, _, err := f.dial(t, "", nil)
	must(t, err, "dial second observer")
	defer second.Close()
	waitClients(t, f.hub, 2)

	f.hub.BroadcastPostcard(models.Postcard{ID: uuid.New(), EventID: publicID, Message: "public postcard"})
	message, err := readMessage(second, 2*time.Second)
	must(t, err, "read postcard message")
	if !containsPlayerName(message, "public postcard") {
		t.Fatalf("global postcard message did not carry the public postcard: %s", message)
	}
}

// eventIDOf resolves the identifier of the event with that slug.
func eventIDOf(t *testing.T, db *sql.DB, slug string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := db.QueryRow(`SELECT id FROM events WHERE slug = $1`, slug).Scan(&id); err != nil {
		t.Fatalf("get event id for %s: %v", slug, err)
	}
	return id
}

// containsPlayerName reports whether the payload mentions that name.
func containsPlayerName(message, name string) bool {
	return len(name) > 0 && strings.Contains(message, name)
}

// The secret reveal is the third filtered broadcast: the secret postcards of a
// private event must not reach an observer either.
func TestWebSocketGlobalBroadcasts_HidePrivateEventSecretReveal(t *testing.T) {
	f := newWSFixture(t)

	db := openWSTestDB(t)
	publicID := eventIDOf(t, db, f.publicSlug)
	privateID := eventIDOf(t, db, f.privateSlug)

	observer, _, err := f.dial(t, "", nil)
	must(t, err, "dial observer")
	defer observer.Close()
	waitClients(t, f.hub, 1)

	f.hub.BroadcastSecretReveal([]models.Postcard{{ID: uuid.New(), EventID: privateID, Message: "private secret", IsSecret: true}})
	assertNoMessage(t, observer, "a secret reveal of a private event reached an observer")

	// A second connection receives the public reveal: a read that times out
	// leaves the first connection unusable.
	second, _, err := f.dial(t, "", nil)
	must(t, err, "dial second observer")
	defer second.Close()
	waitClients(t, f.hub, 2)

	f.hub.BroadcastSecretReveal([]models.Postcard{{ID: uuid.New(), EventID: publicID, Message: "public secret", IsSecret: true}})
	message, err := readMessage(second, 2*time.Second)
	must(t, err, "read secret reveal message")
	if !containsPlayerName(message, "public secret") {
		t.Fatalf("global secret reveal did not carry the public secret: %s", message)
	}
}
