package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// legacyAdminStatus decodes the Secret Box status payload.
func legacyAdminStatus(t *testing.T, response *httptest.ResponseRecorder) models.SecretBoxStatus {
	t.Helper()
	var status models.SecretBoxStatus
	decodeJSON(t, response, &status)
	return status
}

// legacyAdminSecretList decodes the secret postcards list payload.
func legacyAdminSecretList(t *testing.T, response *httptest.ResponseRecorder) ([]models.Postcard, int, bool) {
	t.Helper()
	var payload struct {
		Postcards []models.Postcard `json:"postcards"`
		Total     int               `json:"total"`
		Revealed  bool              `json:"revealed"`
	}
	decodeJSON(t, response, &payload)
	return payload.Postcards, payload.Total, payload.Revealed
}

// ---------------------------------------------------------------------------
// Rule 1: the legacy administration routes require an authenticated account
// ---------------------------------------------------------------------------

func TestLegacyAdminRoutesRequireAuthentication(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	for _, route := range legacyAdminRoutes {
		anonymous := legacyRequest(t, fixture.legacy, route.method, route.path, "")
		if anonymous.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s anonymous status = %d, want 401; body=%s", route.method, route.path, anonymous.Code, anonymous.Body.String())
		}
		if got, want := anonymous.Body.String(), `{"error":"Authentication required"}`; got != want {
			t.Errorf("%s %s anonymous body = %q, want %q", route.method, route.path, got, want)
		}

		invalid := legacyRequest(t, fixture.legacy, route.method, route.path, "not-a-valid-token")
		if invalid.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s invalid token status = %d, want 401; body=%s", route.method, route.path, invalid.Code, invalid.Body.String())
		}
		if got, want := invalid.Body.String(), `{"error":"Authentication required"}`; got != want {
			t.Errorf("%s %s invalid token body = %q, want %q", route.method, route.path, got, want)
		}
	}
}

// ---------------------------------------------------------------------------
// Rule 2: only the administered events are reachable, guests get no access
// ---------------------------------------------------------------------------

func TestLegacyAdminRoutesDenyCallerWithoutAdministeredEvent(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	for _, route := range legacyAdminRoutes {
		response := legacyRequest(t, fixture.legacy, route.method, route.path, fixture.outsiderToken)
		if response.Code != http.StatusForbidden {
			t.Fatalf("%s %s outsider status = %d, want 403; body=%s", route.method, route.path, response.Code, response.Body.String())
		}
		want := `{"error":"Not authorized. You are not the owner or a collaborator of this event"}`
		if got := response.Body.String(); got != want {
			t.Errorf("%s %s outsider body = %q, want %q", route.method, route.path, got, want)
		}
	}
}

func TestLegacyAdminRoutesDenyAcceptedGuest(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	for _, route := range legacyAdminRoutes {
		response := legacyRequest(t, fixture.legacy, route.method, route.path, fixture.guestToken)
		if response.Code != http.StatusForbidden {
			t.Fatalf("%s %s guest status = %d, want 403; body=%s", route.method, route.path, response.Code, response.Body.String())
		}
		want := `{"error":"Not authorized. You are not the owner or a collaborator of this event"}`
		if got := response.Body.String(); got != want {
			t.Errorf("%s %s guest body = %q, want %q", route.method, route.path, got, want)
		}
	}
}

// ---------------------------------------------------------------------------
// Rule 3 + 4: status and list cover exactly the administered events
// ---------------------------------------------------------------------------

func TestLegacyAdminStatusCoversOnlyAdministeredEvents(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	response := legacyGet(t, fixture.legacy, "/api/admin/status", fixture.ownerToken)
	if response.Code != http.StatusOK {
		t.Fatalf("owner status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	status := legacyAdminStatus(t, response)
	if status.Total != 3 {
		t.Errorf("owner status total = %d, want 3 (only the administered events)", status.Total)
	}
	if status.Revealed {
		t.Errorf("owner status revealed = true, want false")
	}

	collaborator := legacyGet(t, fixture.legacy, "/api/admin/status", fixture.collaboratorToken)
	if collaborator.Code != http.StatusOK {
		t.Fatalf("collaborator status = %d, want 200; body=%s", collaborator.Code, collaborator.Body.String())
	}
	collaboratorStatus := legacyAdminStatus(t, collaborator)
	if collaboratorStatus.Total != 2 {
		t.Errorf("collaborator status total = %d, want 2 (only the collaborated event)", collaboratorStatus.Total)
	}
	if collaboratorStatus.Revealed {
		t.Errorf("collaborator status revealed = true, want false")
	}
}

func TestLegacyAdminSecretBoxListsOnlyAdministeredEvents(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	response := legacyGet(t, fixture.legacy, "/api/admin/secret-box", fixture.ownerToken)
	if response.Code != http.StatusOK {
		t.Fatalf("owner secret box = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	postcards, total, revealed := legacyAdminSecretList(t, response)
	if total != 3 || len(postcards) != 3 {
		t.Fatalf("owner secret box total = %d (postcards %d), want 3", total, len(postcards))
	}
	if revealed {
		t.Errorf("owner secret box revealed = true, want false")
	}
	messages := make([]string, 0, len(postcards))
	for _, postcard := range postcards {
		messages = append(messages, postcard.Message)
	}
	if !containsString(messages, "owned secret one") || !containsString(messages, "owned secret two") ||
		!containsString(messages, "owned extra secret") {
		t.Errorf("owner secret box messages = %v, want the administered event secrets", messages)
	}
	if containsString(messages, "foreign secret") {
		t.Errorf("owner secret box exposed a foreign event secret; messages=%v", messages)
	}

	collaborator := legacyGet(t, fixture.legacy, "/api/admin/secret-box", fixture.collaboratorToken)
	if collaborator.Code != http.StatusOK {
		t.Fatalf("collaborator secret box = %d, want 200; body=%s", collaborator.Code, collaborator.Body.String())
	}
	collaboratorPostcards, collaboratorTotal, _ := legacyAdminSecretList(t, collaborator)
	if collaboratorTotal != 2 || len(collaboratorPostcards) != 2 {
		t.Errorf("collaborator secret box total = %d (postcards %d), want 2", collaboratorTotal, len(collaboratorPostcards))
	}
	for _, postcard := range collaboratorPostcards {
		if postcard.Message == "foreign secret" {
			t.Errorf("collaborator secret box exposed a foreign event secret")
		}
	}
}

// ---------------------------------------------------------------------------
// Rule 5 + 7: reveal touches only the administered events and broadcasts per room
// ---------------------------------------------------------------------------

func TestLegacyAdminRevealTouchesOnlyAdministeredEvents(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	response := legacyRequest(t, fixture.legacy, http.MethodPost, "/api/admin/reveal", fixture.collaboratorToken)
	if response.Code != http.StatusOK {
		t.Fatalf("collaborator reveal = %d, want 200; body=%s", response.Code, response.Body.String())
	}

	for _, id := range fixture.ownedSecretIDs {
		if secretRevealedAt(t, fixture.db, id) == nil {
			t.Errorf("secret %s of the administered event was not revealed", id)
		}
	}
	for _, id := range fixture.foreignSecretIDs {
		if secretRevealedAt(t, fixture.db, id) != nil {
			t.Errorf("secret %s of a foreign event was revealed", id)
		}
	}

	if fixture.hub.secretRevealGlobal != 0 {
		t.Errorf("global secret reveal broadcasts = %d, want 0", fixture.hub.secretRevealGlobal)
	}
	if len(fixture.hub.secretRevealRooms) != 1 || fixture.hub.secretRevealRooms[0] != fixture.ownedEvent.Slug {
		t.Errorf("secret reveal rooms = %v, want [%s]", fixture.hub.secretRevealRooms, fixture.ownedEvent.Slug)
	}
	broadcast := fixture.hub.secretRevealMessages[fixture.ownedEvent.Slug]
	if len(broadcast) != 2 {
		t.Errorf("broadcast postcards for %s = %v, want 2", fixture.ownedEvent.Slug, broadcast)
	}
}

func TestLegacyAdminAggregatesEveryAdministeredEvent(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	status := legacyGet(t, fixture.legacy, "/api/admin/status", fixture.ownerToken)
	if status.Code != http.StatusOK {
		t.Fatalf("owner status = %d, want 200; body=%s", status.Code, status.Body.String())
	}
	if got := legacyAdminStatus(t, status).Total; got != 3 {
		t.Errorf("owner status total = %d, want 3 (both administered events)", got)
	}

	list := legacyGet(t, fixture.legacy, "/api/admin/secret-box", fixture.ownerToken)
	if list.Code != http.StatusOK {
		t.Fatalf("owner secret box = %d, want 200; body=%s", list.Code, list.Body.String())
	}
	postcards, total, _ := legacyAdminSecretList(t, list)
	if total != 3 || len(postcards) != 3 {
		t.Fatalf("owner secret box total = %d (postcards %d), want 3", total, len(postcards))
	}

	reveal := legacyRequest(t, fixture.legacy, http.MethodPost, "/api/admin/reveal", fixture.ownerToken)
	if reveal.Code != http.StatusOK {
		t.Fatalf("owner reveal = %d, want 200; body=%s", reveal.Code, reveal.Body.String())
	}
	for _, id := range append(append([]uuid.UUID{}, fixture.ownedSecretIDs...), fixture.extraSecretIDs...) {
		if secretRevealedAt(t, fixture.db, id) == nil {
			t.Errorf("secret %s of an administered event was not revealed", id)
		}
	}
	for _, id := range fixture.foreignSecretIDs {
		if secretRevealedAt(t, fixture.db, id) != nil {
			t.Errorf("secret %s of a foreign event was revealed", id)
		}
	}
	if fixture.hub.secretRevealGlobal != 0 {
		t.Errorf("global secret reveal broadcasts = %d, want 0", fixture.hub.secretRevealGlobal)
	}
	if len(fixture.hub.secretRevealRooms) != 2 {
		t.Fatalf("secret reveal rooms = %v, want one broadcast per administered event", fixture.hub.secretRevealRooms)
	}
	rooms := map[string]bool{}
	for _, slug := range fixture.hub.secretRevealRooms {
		rooms[slug] = true
	}
	if !rooms[fixture.ownedEvent.Slug] || !rooms[fixture.extraEvent.Slug] {
		t.Errorf("secret reveal rooms = %v, want %s and %s", fixture.hub.secretRevealRooms, fixture.ownedEvent.Slug, fixture.extraEvent.Slug)
	}
}

func TestLegacyAdminRevealWithoutPendingSecretsDoesNotBroadcast(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	first := legacyRequest(t, fixture.legacy, http.MethodPost, "/api/admin/reveal", fixture.ownerToken)
	if first.Code != http.StatusOK {
		t.Fatalf("first reveal = %d, want 200; body=%s", first.Code, first.Body.String())
	}
	if len(fixture.hub.secretRevealRooms) != 2 {
		t.Fatalf("secret reveal rooms after first reveal = %v, want one broadcast per administered event", fixture.hub.secretRevealRooms)
	}

	second := legacyRequest(t, fixture.legacy, http.MethodPost, "/api/admin/reveal", fixture.ownerToken)
	if second.Code != http.StatusOK {
		t.Fatalf("second reveal = %d, want 200; body=%s", second.Code, second.Body.String())
	}
	if len(fixture.hub.secretRevealRooms) != 2 {
		t.Errorf("secret reveal rooms after second reveal = %v, want no additional broadcast", fixture.hub.secretRevealRooms)
	}
	if fixture.hub.secretRevealGlobal != 0 {
		t.Errorf("global secret reveal broadcasts = %d, want 0", fixture.hub.secretRevealGlobal)
	}
}

func TestLegacyAdminDeniedRevealChangesNothing(t *testing.T) {
	fixture := newLegacyAdminFixture(t)

	denials := []struct {
		name  string
		token string
		want  int
	}{
		{"anonymous", "", http.StatusUnauthorized},
		{"outsider", fixture.outsiderToken, http.StatusForbidden},
		{"guest", fixture.guestToken, http.StatusForbidden},
	}
	for _, denial := range denials {
		response := legacyRequest(t, fixture.legacy, http.MethodPost, "/api/admin/reveal", denial.token)
		if response.Code != denial.want {
			t.Fatalf("%s reveal = %d, want %d; body=%s", denial.name, response.Code, denial.want, response.Body.String())
		}
	}

	allSecretIDs := append([]uuid.UUID{}, fixture.ownedSecretIDs...)
	allSecretIDs = append(allSecretIDs, fixture.extraSecretIDs...)
	allSecretIDs = append(allSecretIDs, fixture.foreignSecretIDs...)
	for _, id := range allSecretIDs {
		if secretRevealedAt(t, fixture.db, id) != nil {
			t.Errorf("secret %s was revealed by a denied request", id)
		}
	}
	if fixture.hub.secretRevealGlobal != 0 {
		t.Errorf("global secret reveal broadcasts = %d, want 0", fixture.hub.secretRevealGlobal)
	}
	if len(fixture.hub.secretRevealRooms) != 0 {
		t.Errorf("secret reveal rooms = %v, want none", fixture.hub.secretRevealRooms)
	}
}
