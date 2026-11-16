package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// ---------------------------------------------------------------------------
// Rule 6: the event-scoped administration surface keeps its current behavior
// ---------------------------------------------------------------------------

func TestScopedAdminRoutesKeepCurrentBehavior(t *testing.T) {
	fixture := newLegacyAdminFixture(t)
	slug := fixture.ownedEvent.Slug
	foreignSlug := fixture.foreignEvent.Slug

	anonymous := legacyRequest(t, fixture.scoped, http.MethodGet, "/api/admin/events/"+slug+"/status", "")
	if anonymous.Code != http.StatusUnauthorized {
		t.Fatalf("scoped anonymous status = %d, want 401; body=%s", anonymous.Code, anonymous.Body.String())
	}

	guest := legacyRequest(t, fixture.scoped, http.MethodGet, "/api/admin/events/"+slug+"/status", fixture.guestToken)
	if guest.Code != http.StatusForbidden {
		t.Fatalf("scoped guest status = %d, want 403; body=%s", guest.Code, guest.Body.String())
	}
	want := `{"error":"Not authorized. You are not the owner or a collaborator of this event"}`
	if got := guest.Body.String(); got != want {
		t.Errorf("scoped guest body = %q, want %q", got, want)
	}

	owner := legacyRequest(t, fixture.scoped, http.MethodGet, "/api/admin/events/"+slug+"/status", fixture.ownerToken)
	if owner.Code != http.StatusOK {
		t.Fatalf("scoped owner status = %d, want 200; body=%s", owner.Code, owner.Body.String())
	}
	ownerStatus := legacyAdminStatus(t, owner)
	if ownerStatus.Total != 2 {
		t.Errorf("scoped owner status total = %d, want 2", ownerStatus.Total)
	}

	collaborator := legacyRequest(t, fixture.scoped, http.MethodGet, "/api/admin/events/"+slug+"/status", fixture.collaboratorToken)
	if collaborator.Code != http.StatusOK {
		t.Fatalf("scoped collaborator status = %d, want 200; body=%s", collaborator.Code, collaborator.Body.String())
	}

	foreign := legacyRequest(t, fixture.scoped, http.MethodGet, "/api/admin/events/"+foreignSlug+"/status", fixture.collaboratorToken)
	if foreign.Code != http.StatusForbidden {
		t.Fatalf("scoped collaborator of foreign event status = %d, want 403; body=%s", foreign.Code, foreign.Body.String())
	}

	ownerList := legacyRequest(t, fixture.scoped, http.MethodGet, "/api/admin/events/"+slug+"/secret-box", fixture.ownerToken)
	if ownerList.Code != http.StatusOK {
		t.Fatalf("scoped owner secret box = %d, want 200; body=%s", ownerList.Code, ownerList.Body.String())
	}
	postcards, total, revealed := legacyAdminSecretList(t, ownerList)
	if total != 2 || len(postcards) != 2 {
		t.Errorf("scoped owner secret box total = %d (postcards %d), want 2", total, len(postcards))
	}
	if revealed {
		t.Errorf("scoped owner secret box revealed = true, want false")
	}

	guestReveal := legacyRequest(t, fixture.scoped, http.MethodPost, "/api/admin/events/"+slug+"/reveal", fixture.guestToken)
	if guestReveal.Code != http.StatusForbidden {
		t.Fatalf("scoped guest reveal = %d, want 403; body=%s", guestReveal.Code, guestReveal.Body.String())
	}
	for _, id := range fixture.ownedSecretIDs {
		if secretRevealedAt(t, fixture.db, id) != nil {
			t.Errorf("scoped denied guest reveal changed secret %s", id)
		}
	}
}

func TestSecretBoxTokenEndpointKeepsOwnerOnlyPermissions(t *testing.T) {
	fixture := newLegacyAdminFixture(t)
	path := "/api/admin/events/" + fixture.ownedEvent.Slug + "/secret-box/token"

	owner := legacyRequest(t, fixture.ownerOnly, http.MethodGet, path, fixture.ownerToken)
	if owner.Code != http.StatusOK {
		t.Fatalf("owner token status = %d, want 200; body=%s", owner.Code, owner.Body.String())
	}

	collaborator := legacyRequest(t, fixture.ownerOnly, http.MethodGet, path, fixture.collaboratorToken)
	if collaborator.Code != http.StatusForbidden {
		t.Fatalf("collaborator token status = %d, want 403; body=%s", collaborator.Code, collaborator.Body.String())
	}

	anonymous := legacyRequest(t, fixture.ownerOnly, http.MethodGet, path, "")
	if anonymous.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous token status = %d, want 401; body=%s", anonymous.Code, anonymous.Body.String())
	}
}

func TestAdminQuestionOwnershipCheckIsUnchanged(t *testing.T) {
	fixture := newLegacyAdminFixture(t)
	path := "/api/admin/questions/" + fixture.ownedQuestionID.String()

	body, err := json.Marshal(map[string]any{"question_text": "¿Cancion favorita?"})
	if err != nil {
		t.Fatalf("marshal question payload error = %v", err)
	}

	send := func(token string) *httptest.ResponseRecorder {
		request := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		if token != "" {
			request.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		fixture.questions.ServeHTTP(response, request)
		return response
	}

	anonymous := send("")
	if anonymous.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous question update = %d, want 401; body=%s", anonymous.Code, anonymous.Body.String())
	}

	collaborator := send(fixture.collaboratorToken)
	if collaborator.Code != http.StatusForbidden {
		t.Fatalf("collaborator question update = %d, want 403; body=%s", collaborator.Code, collaborator.Body.String())
	}
	if got, want := collaborator.Body.String(), `{"error":"Not authorized. You are not the owner of this event"}`; got != want {
		t.Errorf("collaborator question body = %q, want %q", got, want)
	}

	owner := send(fixture.ownerToken)
	if owner.Code != http.StatusOK {
		t.Fatalf("owner question update = %d, want 200; body=%s", owner.Code, owner.Body.String())
	}
}

// ---------------------------------------------------------------------------
// Rule 6: the public legacy read behavior of T1 is preserved
// ---------------------------------------------------------------------------

func TestLegacyPublicReadsRemainAnonymous(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	public := legacyGet(t, fixture.router, "/api/players/"+fixture.publicPlayer.ID.String(), "")
	if public.Code != http.StatusOK {
		t.Fatalf("public player lookup = %d, want 200; body=%s", public.Code, public.Body.String())
	}

	private := legacyGet(t, fixture.router, "/api/players/"+fixture.privatePlayer.ID.String(), "")
	if private.Code != http.StatusUnauthorized {
		t.Fatalf("private player lookup = %d, want 401; body=%s", private.Code, private.Body.String())
	}
	if got, want := private.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("private player body = %q, want %q", got, want)
	}
}
