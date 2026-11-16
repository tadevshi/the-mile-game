package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
)

func TestLegacyOptionalAuthDoesNotChangePublicBehavior(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	tampered := fixture.ownerToken
	if len(tampered) < 2 {
		t.Fatalf("unexpected access token %q", tampered)
	}
	tampered = tampered[:len(tampered)-1] + "X"

	headers := map[string]string{
		"absent":            "",
		"empty bearer":      "Bearer ",
		"malformed scheme":  "Basic " + fixture.ownerToken,
		"missing token":     "Bearer",
		"not a jwt":         "Bearer not-a-jwt",
		"invalid signature": "Bearer " + tampered,
	}

	for name, header := range headers {
		t.Run(name, func(t *testing.T) {
			router := gin.New()
			router.Use(middleware.OptionalAuthMiddleware(fixture.auth))
			router.GET("/api/players/:id", fixture.handler.GetPlayer)

			request := httptest.NewRequest(http.MethodGet, "/api/players/"+fixture.publicPlayer.ID.String(), nil)
			if header != "" {
				request.Header.Set("Authorization", header)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusOK {
				t.Errorf("public player lookup status = %d, want 200; body=%s", response.Code, response.Body.String())
			}

			request = httptest.NewRequest(http.MethodGet, "/api/players/"+fixture.privatePlayer.ID.String(), nil)
			if header != "" {
				request.Header.Set("Authorization", header)
			}
			response = httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized {
				t.Errorf("private player lookup status = %d, want 401; body=%s", response.Code, response.Body.String())
			}
			if got, want := response.Body.String(), `{"error":"Authentication required"}`; got != want {
				t.Errorf("private player lookup body = %q, want %q", got, want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Rule 4: rejected writes do not change the stored data
// ---------------------------------------------------------------------------

func TestLegacyRejectedWritesLeaveStoredDataUnchanged(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)
	ownerToken := fixture.ownerToken

	answersBefore := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.privatePlayer.ID.String(), ownerToken)
	if answersBefore.Code != http.StatusOK {
		t.Fatalf("owner answers status = %d, want 200; body=%s", answersBefore.Code, answersBefore.Body.String())
	}
	playerBefore := legacyGet(t, fixture.router, "/api/players/"+fixture.privatePlayer.ID.String(), ownerToken)
	if playerBefore.Code != http.StatusOK {
		t.Fatalf("owner player status = %d, want 200; body=%s", playerBefore.Code, playerBefore.Body.String())
	}
	var playerBeforePayload models.Player
	decodeJSON(t, playerBefore, &playerBeforePayload)
	postcardsBefore := legacyGet(t, fixture.router, "/api/postcards", ownerToken)
	if postcardsBefore.Code != http.StatusOK {
		t.Fatalf("owner postcards status = %d, want 200; body=%s", postcardsBefore.Code, postcardsBefore.Body.String())
	}
	postcardsBeforeCount := len(postcardMessages(t, postcardsBefore))
	filesBefore := countStoredFiles(t, filepath.Join(fixture.uploadsDir, "postcards"))

	submit := legacyPostJSON(t, fixture.router, "/api/quiz/submit", "", models.SubmitQuizRequest{
		Favorites:   map[string]string{"favorite": "ZZZ"},
		Preferences: map[string]string{"drink": "tea"},
		Description: "rejected submit",
	}, fixture.privatePlayer.ID.String())
	if submit.Code != http.StatusUnauthorized {
		t.Fatalf("rejected submit status = %d, want 401; body=%s", submit.Code, submit.Body.String())
	}

	postcard := legacyPostPostcard(t, fixture.router, "", fixture.privatePlayer.ID.String())
	if postcard.Code != http.StatusUnauthorized {
		t.Fatalf("rejected postcard status = %d, want 401; body=%s", postcard.Code, postcard.Body.String())
	}

	answersAfter := legacyGet(t, fixture.router, "/api/quiz/answers/"+fixture.privatePlayer.ID.String(), ownerToken)
	if answersAfter.Code != http.StatusOK {
		t.Fatalf("owner answers after rejection status = %d, want 200; body=%s", answersAfter.Code, answersAfter.Body.String())
	}
	if answersAfter.Body.String() != answersBefore.Body.String() {
		t.Errorf("rejected submit changed the stored answers: before=%s after=%s", answersBefore.Body.String(), answersAfter.Body.String())
	}

	playerAfter := legacyGet(t, fixture.router, "/api/players/"+fixture.privatePlayer.ID.String(), ownerToken)
	if playerAfter.Code != http.StatusOK {
		t.Fatalf("owner player after rejection status = %d, want 200; body=%s", playerAfter.Code, playerAfter.Body.String())
	}
	var playerAfterPayload models.Player
	decodeJSON(t, playerAfter, &playerAfterPayload)
	if playerAfterPayload.Score != playerBeforePayload.Score {
		t.Errorf("rejected submit changed the stored score: before=%d after=%d", playerBeforePayload.Score, playerAfterPayload.Score)
	}

	postcardsAfter := legacyGet(t, fixture.router, "/api/postcards", ownerToken)
	if postcardsAfter.Code != http.StatusOK {
		t.Fatalf("owner postcards after rejection status = %d, want 200; body=%s", postcardsAfter.Code, postcardsAfter.Body.String())
	}
	if got := len(postcardMessages(t, postcardsAfter)); got != postcardsBeforeCount {
		t.Errorf("rejected postcard changed the stored postcard count: before=%d after=%d", postcardsBeforeCount, got)
	}

	filesAfter := countStoredFiles(t, filepath.Join(fixture.uploadsDir, "postcards"))
	if filesAfter != filesBefore {
		t.Errorf("rejected postcard stored media files: before=%d after=%d", filesBefore, filesAfter)
	}
}

// ---------------------------------------------------------------------------
// Rule 4: eventless legacy data keeps working
// ---------------------------------------------------------------------------

func TestLegacyEventlessCreationKeepsWorking(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	created := legacyPostJSON(t, fixture.router, "/api/players", "", models.CreatePlayerRequest{Name: "Legacy New", Avatar: "👤"}, "")
	if created.Code != http.StatusCreated {
		t.Fatalf("legacy player creation status = %d, want 201; body=%s", created.Code, created.Body.String())
	}
	var createdPlayer models.Player
	decodeJSON(t, created, &createdPlayer)

	lookup := legacyGet(t, fixture.router, "/api/players/"+createdPlayer.ID.String(), "")
	if lookup.Code != http.StatusOK {
		t.Fatalf("eventless player lookup status = %d, want 200; body=%s", lookup.Code, lookup.Body.String())
	}
	ids := playerIDs(t, legacyGet(t, fixture.router, "/api/players", ""))
	if !containsString(ids, createdPlayer.ID.String()) {
		t.Errorf("players list missing the created eventless player %s", createdPlayer.ID)
	}

	// The legacy quiz submit keeps working for eventless players.
	submit := legacyPostJSON(t, fixture.router, "/api/quiz/submit", "", models.SubmitQuizRequest{
		Favorites:   map[string]string{"favorite": "F"},
		Preferences: map[string]string{},
		Description: "eventless submit",
	}, createdPlayer.ID.String())
	if submit.Code != http.StatusOK {
		t.Fatalf("eventless submit status = %d, want 200; body=%s", submit.Code, submit.Body.String())
	}
	answers := legacyGet(t, fixture.router, "/api/quiz/answers/"+createdPlayer.ID.String(), "")
	if answers.Code != http.StatusOK {
		t.Fatalf("eventless answers status = %d, want 200; body=%s", answers.Code, answers.Body.String())
	}
	if got, want := answerDescription(t, answers), "eventless submit"; got != want {
		t.Errorf("eventless answers description = %q, want %q", got, want)
	}
	rankingIDs := rankingPlayerIDs(t, legacyGet(t, fixture.router, "/api/ranking", ""))
	if !containsString(rankingIDs, createdPlayer.ID.String()) {
		t.Errorf("ranking missing the eventless player %s; ids=%v", createdPlayer.ID, rankingIDs)
	}

	// The legacy postcard creation keeps working for eventless players.
	postcardForPlayer := legacyPostPostcard(t, fixture.router, "", createdPlayer.ID.String())
	if postcardForPlayer.Code != http.StatusCreated {
		t.Fatalf("eventless postcard creation status = %d, want 201; body=%s", postcardForPlayer.Code, postcardForPlayer.Body.String())
	}

	postcard := legacyPostPostcard(t, fixture.router, "", "")
	if postcard.Code != http.StatusCreated {
		t.Fatalf("legacy postcard creation status = %d, want 201; body=%s", postcard.Code, postcard.Body.String())
	}
	var createdPostcard models.Postcard
	decodeJSON(t, postcard, &createdPostcard)

	messages := postcardMessages(t, legacyGet(t, fixture.router, "/api/postcards", ""))
	if !containsString(messages, "legacy postcard") {
		t.Errorf("postcards list missing the created eventless postcard; messages=%v", messages)
	}
}

// ---------------------------------------------------------------------------
// Rule 5: the legacy routes fail closed without the visibility dependency
// ---------------------------------------------------------------------------

func TestLegacyRoutesFailClosedWithoutVisibilityDependency(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	handler := NewHandler(
		fixture.playerRepo,
		fixture.quizRepo,
		fixture.quizQuestionRepo,
		fixture.postcardRepo,
		nil,
		fixture.uploadsDir,
	)

	router := gin.New()
	router.GET("/api/players/:id", handler.GetPlayer)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/players/"+fixture.publicPlayer.ID.String(), nil)
	router.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Errorf("unconfigured visibility status = %d, want 401; body=%s", response.Code, response.Body.String())
	}
	if got, want := response.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("unconfigured visibility body = %q, want %q", got, want)
	}
}

// ---------------------------------------------------------------------------
// Rule 6: the scoped routes keep the MR3 behavior
// ---------------------------------------------------------------------------

func TestScopedRoutesKeepMR3VisibilityBehavior(t *testing.T) {
	fixture := newLegacyVisibilityFixture(t)

	public := legacyGet(t, fixture.scoped, "/api/events/"+fixture.publicEvent.Slug+"/players/"+fixture.publicPlayer.ID.String(), "")
	if public.Code != http.StatusOK {
		t.Fatalf("scoped public player status = %d, want 200; body=%s", public.Code, public.Body.String())
	}

	privateAnonymous := legacyGet(t, fixture.scoped, "/api/events/"+fixture.privateEvent.Slug+"/players/"+fixture.privatePlayer.ID.String(), "")
	if privateAnonymous.Code != http.StatusUnauthorized {
		t.Fatalf("scoped private player status = %d, want 401; body=%s", privateAnonymous.Code, privateAnonymous.Body.String())
	}
	if got, want := privateAnonymous.Body.String(), `{"error":"Authentication required"}`; got != want {
		t.Errorf("scoped private player body = %q, want %q", got, want)
	}

	privateOutsider := legacyGet(t, fixture.scoped, "/api/events/"+fixture.privateEvent.Slug+"/players/"+fixture.privatePlayer.ID.String(), fixture.outsiderToken)
	if privateOutsider.Code != http.StatusForbidden {
		t.Fatalf("scoped private player status = %d, want 403; body=%s", privateOutsider.Code, privateOutsider.Body.String())
	}
	if got, want := privateOutsider.Body.String(), `{"error":"Not authorized to view this event"}`; got != want {
		t.Errorf("scoped private player body = %q, want %q", got, want)
	}

	privateOwner := legacyGet(t, fixture.scoped, "/api/events/"+fixture.privateEvent.Slug+"/players/"+fixture.privatePlayer.ID.String(), fixture.ownerToken)
	if privateOwner.Code != http.StatusOK {
		t.Fatalf("scoped private player status = %d, want 200; body=%s", privateOwner.Code, privateOwner.Body.String())
	}

	scopedSubmit := httptest.NewRecorder()
	payload, err := json.Marshal(models.SubmitQuizRequest{
		Favorites:   map[string]string{"favorite": "E"},
		Preferences: map[string]string{},
		Description: "scoped submit",
	})
	if err != nil {
		t.Fatalf("marshal payload error = %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/events/"+fixture.privateEvent.Slug+"/quiz/submit", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Player-ID", fixture.privatePlayer.ID.String())
	fixture.scoped.ServeHTTP(scopedSubmit, request)
	if scopedSubmit.Code != http.StatusUnauthorized {
		t.Fatalf("scoped private submit status = %d, want 401; body=%s", scopedSubmit.Code, scopedSubmit.Body.String())
	}
}
