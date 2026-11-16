package handlers

import (
	"net/http"
	"strings"
	"testing"

	_ "github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/models"
)

func TestLegacyRoutesExposePublicEventAnonymously(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	player := legacyGet(t, fixture.router, "/api/players/"+fixture.publicPlayer.ID.String(), "")
	if player.Code != http.StatusOK {
		t.Fatalf("public player lookup status = %d, want 200; body=%s", player.Code, player.Body.String())
	}
	var playerPayload models.Player
	decodeJSON(t, player, &playerPayload)
	if playerPayload.ID != fixture.publicPlayer.ID {
		t.Errorf("public player lookup id = %s, want %s", playerPayload.ID, fixture.publicPlayer.ID)
	}

	players := legacyGet(t, fixture.router, "/api/players", "")
	if players.Code != http.StatusOK {
		t.Fatalf("players list status = %d, want 200; body=%s", players.Code, players.Body.String())
	}
	ids := playerIDs(t, players)
	if !containsString(ids, fixture.publicPlayer.ID.String()) {
		t.Errorf("players list missing public player %s; ids=%v", fixture.publicPlayer.ID, ids)
	}
	if !containsString(ids, fixture.legacyPlayer.ID.String()) {
		t.Errorf("players list missing eventless player %s; ids=%v", fixture.legacyPlayer.ID, ids)
	}
	if containsString(ids, fixture.privatePlayer.ID.String()) {
		t.Errorf("players list exposed private player %s", fixture.privatePlayer.ID)
	}

	ranking := legacyGet(t, fixture.router, "/api/ranking", "")
	if ranking.Code != http.StatusOK {
		t.Fatalf("ranking status = %d, want 200; body=%s", ranking.Code, ranking.Body.String())
	}
	rankingIDs := rankingPlayerIDs(t, ranking)
	if !containsString(rankingIDs, fixture.publicPlayer.ID.String()) {
		t.Errorf("ranking missing public player %s; ids=%v", fixture.publicPlayer.ID, rankingIDs)
	}
	if containsString(rankingIDs, fixture.privatePlayer.ID.String()) {
		t.Errorf("ranking exposed private player %s", fixture.privatePlayer.ID)
	}

	answers := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.publicPlayer.ID.String(), "")
	if answers.Code != http.StatusOK {
		t.Fatalf("public answers status = %d, want 200; body=%s", answers.Code, answers.Body.String())
	}
	if !strings.Contains(answers.Body.String(), fixture.publicDescription) {
		t.Errorf("public answers body = %s, want description %q", answers.Body.String(), fixture.publicDescription)
	}

	postcards := legacyGet(t, fixture.router, "/api/postcards", "")
	if postcards.Code != http.StatusOK {
		t.Fatalf("postcards list status = %d, want 200; body=%s", postcards.Code, postcards.Body.String())
	}
	messages := postcardMessages(t, postcards)
	if !containsString(messages, "public postcard") {
		t.Errorf("postcards list missing public postcard; messages=%v", messages)
	}
	if containsString(messages, "private postcard") {
		t.Errorf("postcards list exposed private postcard; messages=%v", messages)
	}

	desc := legacyGet(t, fixture.router, "/api/quiz/descriptions", "")
	if desc.Code != http.StatusOK {
		t.Fatalf("descriptions status = %d, want 200; body=%s", desc.Code, desc.Body.String())
	}
	descriptionsList := descriptionList(t, desc)
	if !containsString(descriptionsList, fixture.publicDescription) {
		t.Errorf("descriptions missing public description %q; got=%v", fixture.publicDescription, descriptionsList)
	}
	if containsString(descriptionsList, fixture.privateDescription) {
		t.Errorf("descriptions exposed private description %q", fixture.privateDescription)
	}
}

func TestLegacyPrivateEventIsDeniedAnonymously(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	player := legacyGet(t, fixture.router, "/api/players/"+fixture.privatePlayer.ID.String(), "")
	if player.Code != http.StatusUnauthorized {
		t.Fatalf("private player lookup status = %d, want 401; body=%s", player.Code, player.Body.String())
	}
	if got, want := player.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("private player lookup body = %q, want %q", got, want)
	}

	answers := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.privatePlayer.ID.String(), "")
	if answers.Code != http.StatusUnauthorized {
		t.Fatalf("private answers status = %d, want 401; body=%s", answers.Code, answers.Body.String())
	}
	if got, want := answers.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("private answers body = %q, want %q", got, want)
	}

	submit := legacyPostJSON(t, fixture.router, "/api/quiz/submit", "", models.SubmitQuizRequest{
		Favorites:   map[string]string{"favorite": "C"},
		Preferences: map[string]string{},
		Description: "anonymous private submit",
	}, fixture.privatePlayer.ID.String())
	if submit.Code != http.StatusUnauthorized {
		t.Fatalf("private submit status = %d, want 401; body=%s", submit.Code, submit.Body.String())
	}
	if got, want := submit.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("private submit body = %q, want %q", got, want)
	}

	postcard := legacyPostPostcard(t, fixture.router, "", fixture.privatePlayer.ID.String())
	if postcard.Code != http.StatusUnauthorized {
		t.Fatalf("private postcard creation status = %d, want 401; body=%s", postcard.Code, postcard.Body.String())
	}
	if got, want := postcard.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("private postcard creation body = %q, want %q", got, want)
	}

	// The list routes keep answering 200 and hide the private rows.
	for _, path := range []string{"/api/players", "/api/ranking", "/api/postcards", "/api/quiz/descriptions"} {
		response := legacyGet(t, fixture.router, path, "")
		if response.Code != http.StatusOK {
			t.Errorf("anonymous %s status = %d, want 200; body=%s", path, response.Code, response.Body.String())
		}
	}
}

func TestLegacyPrivateEventIsDeniedForAuthenticatedNonMember(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)
	token := fixture.outsiderToken

	player := legacyGet(t, fixture.router, "/api/players/"+fixture.privatePlayer.ID.String(), token)
	if player.Code != http.StatusForbidden {
		t.Fatalf("private player lookup status = %d, want 403; body=%s", player.Code, player.Body.String())
	}
	if got, want := player.Body.String(), `{"error":"Not authorized to view this event"}`; got != want {
		t.Errorf("private player lookup body = %q, want %q", got, want)
	}

	answers := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.privatePlayer.ID.String(), token)
	if answers.Code != http.StatusForbidden {
		t.Fatalf("private answers status = %d, want 403; body=%s", answers.Code, answers.Body.String())
	}
	if got, want := answers.Body.String(), `{"error":"Not authorized to view this event"}`; got != want {
		t.Errorf("private answers body = %q, want %q", got, want)
	}

	submit := legacyPostJSON(t, fixture.router, "/api/quiz/submit", token, models.SubmitQuizRequest{
		Favorites:   map[string]string{"favorite": "C"},
		Preferences: map[string]string{},
		Description: "outsider private submit",
	}, fixture.privatePlayer.ID.String())
	if submit.Code != http.StatusForbidden {
		t.Fatalf("private submit status = %d, want 403; body=%s", submit.Code, submit.Body.String())
	}
	if got, want := submit.Body.String(), `{"error":"Not authorized to view this event"}`; got != want {
		t.Errorf("private submit body = %q, want %q", got, want)
	}

	postcard := legacyPostPostcard(t, fixture.router, token, fixture.privatePlayer.ID.String())
	if postcard.Code != http.StatusForbidden {
		t.Fatalf("private postcard creation status = %d, want 403; body=%s", postcard.Code, postcard.Body.String())
	}
	if got, want := postcard.Body.String(), `{"error":"Not authorized to view this event"}`; got != want {
		t.Errorf("private postcard creation body = %q, want %q", got, want)
	}

	ids := playerIDs(t, legacyGet(t, fixture.router, "/api/players", token))
	if containsString(ids, fixture.privatePlayer.ID.String()) {
		t.Errorf("players list exposed private player for non-member")
	}
	rankingIDs := rankingPlayerIDs(t, legacyGet(t, fixture.router, "/api/ranking", token))
	if containsString(rankingIDs, fixture.privatePlayer.ID.String()) {
		t.Errorf("ranking exposed private player for non-member")
	}
	messages := postcardMessages(t, legacyGet(t, fixture.router, "/api/postcards", token))
	if containsString(messages, "private postcard") {
		t.Errorf("postcards list exposed private postcard for non-member")
	}
	descriptionsList := descriptionList(t, legacyGet(t, fixture.router, "/api/quiz/descriptions", token))
	if containsString(descriptionsList, fixture.privateDescription) {
		t.Errorf("descriptions exposed private description for non-member")
	}
}

func TestLegacyPrivateEventIsAllowedForOwnerCollaboratorAndGuest(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	members := map[string]string{
		"owner":        fixture.ownerToken,
		"collaborator": fixture.collaboratorToken,
		"guest":        fixture.guestToken,
	}

	for role, token := range members {
		t.Run(role, func(t *testing.T) {
			player := legacyGet(t, fixture.router, "/api/players/"+fixture.privatePlayer.ID.String(), token)
			if player.Code != http.StatusOK {
				t.Fatalf("%s private player lookup status = %d, want 200; body=%s", role, player.Code, player.Body.String())
			}

			answers := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.privatePlayer.ID.String(), token)
			if answers.Code != http.StatusOK {
				t.Fatalf("%s private answers status = %d, want 200; body=%s", role, answers.Code, answers.Body.String())
			}
			currentDescription := answerDescription(t, answers)
			if currentDescription == "" {
				t.Fatalf("%s private answers body = %s, want a stored description", role, answers.Body.String())
			}

			ids := playerIDs(t, legacyGet(t, fixture.router, "/api/players", token))
			if !containsString(ids, fixture.privatePlayer.ID.String()) {
				t.Errorf("%s players list missing private player; ids=%v", role, ids)
			}

			rankingIDs := rankingPlayerIDs(t, legacyGet(t, fixture.router, "/api/ranking", token))
			if !containsString(rankingIDs, fixture.privatePlayer.ID.String()) {
				t.Errorf("%s ranking missing private player; ids=%v", role, rankingIDs)
			}

			messages := postcardMessages(t, legacyGet(t, fixture.router, "/api/postcards", token))
			if !containsString(messages, "private postcard") {
				t.Errorf("%s postcards list missing private postcard; messages=%v", role, messages)
			}

			descriptionsList := descriptionList(t, legacyGet(t, fixture.router, "/api/quiz/descriptions", token))
			if !containsString(descriptionsList, currentDescription) {
				t.Errorf("%s descriptions missing private description %q; got=%v", role, currentDescription, descriptionsList)
			}

			submit := legacyPostJSON(t, fixture.router, "/api/quiz/submit", token, models.SubmitQuizRequest{
				Favorites:   map[string]string{"favorite": "D"},
				Preferences: map[string]string{},
				Description: role + " private submit",
			}, fixture.privatePlayer.ID.String())
			if submit.Code != http.StatusOK {
				t.Fatalf("%s private submit status = %d, want 200; body=%s", role, submit.Code, submit.Body.String())
			}

			answersAfter := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.privatePlayer.ID.String(), token)
			if answersAfter.Code != http.StatusOK {
				t.Fatalf("%s private answers after submit status = %d, want 200; body=%s", role, answersAfter.Code, answersAfter.Body.String())
			}
			if got, want := answerDescription(t, answersAfter), role+" private submit"; got != want {
				t.Errorf("%s private answers after submit description = %q, want %q", role, got, want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Rule 1: optional auth keeps the public path untouched
// ---------------------------------------------------------------------------
