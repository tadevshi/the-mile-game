package models

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// publicEventExpectedKeys es la allowlist exacta de campos que puede devolver
// una respuesta pública de evento. Si se agrega o quita un campo, el test falla.
var publicEventExpectedKeys = []string{
	"created_at",
	"description",
	"ends_at",
	"features",
	"id",
	"is_active",
	"name",
	"owner_id",
	"settings",
	"slug",
	"starts_at",
}

func newEventWithTokens() *Event {
	inviteToken := "invite-token-secret"
	secretBoxToken := "secret-box-token-secret"
	startsAt := time.Date(2026, 3, 17, 10, 0, 0, 0, time.UTC)
	endsAt := time.Date(2026, 3, 17, 22, 0, 0, 0, time.UTC)
	return &Event{
		ID:          uuid.New(),
		Slug:        "mile-2026",
		OwnerID:     uuid.New(),
		Name:        "Mile's Birthday 2026",
		Description: "A fun birthday",
		Features:    EventFeatures{Quiz: true, Corkboard: true, SecretBox: true},
		Settings: EventSettings{
			Theme:           "classic",
			PrimaryColor:    "#EC4899",
			BackgroundImage: "bg.png",
			LogoURL:         "logo.png",
			BackgroundURL:   "bg.jpg",
			PostcardStyle:   PostcardStylePolaroid,
		},
		SecretBoxToken: &secretBoxToken,
		InviteToken:    &inviteToken,
		StartsAt:       &startsAt,
		EndsAt:         &endsAt,
		IsActive:       true,
		CreatedAt:      time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC),
	}
}

func TestNewPublicEventResponse_OmitsSensitiveTokens(t *testing.T) {
	event := newEventWithTokens()

	response := NewPublicEventResponse(event)
	require.NotNil(t, response)

	raw, err := json.Marshal(response)
	require.NoError(t, err)

	var decoded map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(raw, &decoded))

	assert.NotContains(t, decoded, "invite_token", "invite_token must never be exposed")
	assert.NotContains(t, decoded, "secret_box_token", "secret_box_token must never be exposed")
	assert.NotContains(t, string(raw), "invite-token-secret")
	assert.NotContains(t, string(raw), "secret-box-token-secret")
}

func TestNewPublicEventResponse_UsesExplicitAllowlistOfKeys(t *testing.T) {
	event := newEventWithTokens()

	raw, err := json.Marshal(NewPublicEventResponse(event))
	require.NoError(t, err)

	var decoded map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(raw, &decoded))

	keys := make([]string, 0, len(decoded))
	for key := range decoded {
		keys = append(keys, key)
	}
	assert.ElementsMatch(t, publicEventExpectedKeys, keys)
}

func TestNewPublicEventResponse_PreservesNonSecretFields(t *testing.T) {
	event := newEventWithTokens()

	response := NewPublicEventResponse(event)
	require.NotNil(t, response)

	assert.Equal(t, event.ID, response.ID)
	assert.Equal(t, event.Slug, response.Slug)
	assert.Equal(t, event.OwnerID, response.OwnerID)
	assert.Equal(t, event.Name, response.Name)
	assert.Equal(t, event.Description, response.Description)
	assert.Equal(t, event.Features, response.Features)
	assert.Equal(t, event.Settings, response.Settings)
	assert.Equal(t, event.StartsAt, response.StartsAt)
	assert.Equal(t, event.EndsAt, response.EndsAt)
	assert.Equal(t, event.IsActive, response.IsActive)
	assert.Equal(t, event.CreatedAt, response.CreatedAt)
}

func TestNewPublicEventResponse_KeepsExistingJSONKeyNames(t *testing.T) {
	event := newEventWithTokens()
	event.Features = EventFeatures{Quiz: true, Corkboard: false, SecretBox: true}

	raw, err := json.Marshal(NewPublicEventResponse(event))
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(raw, &decoded))

	features, ok := decoded["features"].(map[string]any)
	require.True(t, ok)
	assert.Contains(t, features, "quiz")
	assert.Contains(t, features, "corkboard")
	assert.Contains(t, features, "secretBox", "features keys must keep the existing secretBox name")

	settings, ok := decoded["settings"].(map[string]any)
	require.True(t, ok)
	assert.Contains(t, settings, "theme")
	assert.Contains(t, settings, "primary_color")
	assert.Contains(t, settings, "background_image")
	assert.Contains(t, settings, "logo_url")
	assert.Contains(t, settings, "background_url")
	assert.Contains(t, settings, "postcard_style")
}

func TestNewPublicEventResponse_NilEvent(t *testing.T) {
	assert.Nil(t, NewPublicEventResponse(nil))
}

func TestNewPublicEventResponses_OmitsTokensAndKeepsEveryEvent(t *testing.T) {
	owned := newEventWithTokens()
	collaborated := newEventWithTokens()
	collaborated.Slug = "shared-event"

	responses := NewPublicEventResponses([]Event{*owned, *collaborated})
	require.Len(t, responses, 2)

	raw, err := json.Marshal(responses)
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "invite_token")
	assert.NotContains(t, string(raw), "secret_box_token")
	assert.NotContains(t, string(raw), "invite-token-secret")
	assert.NotContains(t, string(raw), "secret-box-token-secret")

	assert.Equal(t, "mile-2026", responses[0].Slug)
	assert.Equal(t, "shared-event", responses[1].Slug)
}

func TestNewPublicEventResponses_NilSliceReturnsEmptyArray(t *testing.T) {
	responses := NewPublicEventResponses(nil)
	require.NotNil(t, responses)
	assert.Empty(t, responses)

	raw, err := json.Marshal(responses)
	require.NoError(t, err)
	assert.Equal(t, "[]", string(raw))
}
