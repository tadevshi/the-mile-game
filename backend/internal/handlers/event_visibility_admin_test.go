package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
)

type visibilityUpdater struct {
	stored         models.Event
	writes         int
	sentVisibility string
}

func (u *visibilityUpdater) Update(event *models.Event) error {
	u.writes++
	u.sentVisibility = event.Visibility
	visibility := u.stored.Visibility
	u.stored = *event
	if event.Visibility == "" {
		u.stored.Visibility = visibility
	}
	return nil
}

func TestEventVisibilityAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, role, body, visibility string
		code                         int
	}{
		{"owner makes private", "owner", `{"features":{},"visibility":"private"}`, "private", 200},
		{"collaborator makes public", "collaborator", `{"features":{},"visibility":"public"}`, "public", 200},
		{"omitted preserves private and old fields", "owner", `{"features":{"quiz":false,"secret_box":true},"settings":{"postcard_style":"polaroid"}}`, "private", 200},
		{"invalid is atomic", "owner", `{"features":{"quiz":false},"settings":{"postcard_style":"polaroid"},"visibility":"hidden"}`, "private", 400},
		{"empty rejected", "owner", `{"features":{},"visibility":""}`, "private", 400},
		{"null rejected", "owner", `{"features":{},"visibility":null}`, "private", 400},
		{"nonstring rejected", "owner", `{"features":{},"visibility":true}`, "private", 400},
		{"guest cannot administer", "guest", `{"features":{"quiz":false},"visibility":"public"}`, "private", 403},
	} {
		t.Run(tc.name, func(t *testing.T) {
			owner, user := uuid.New(), uuid.New()
			initial := models.Event{
				ID: uuid.New(), OwnerID: owner, Slug: "party", Name: "Keep name", Description: "Keep description",
				Visibility: "private", IsActive: true, Features: models.EventFeatures{Quiz: true, Corkboard: true},
				Settings: models.EventSettings{Theme: "pink", PostcardStyle: models.PostcardStyleClassic},
			}
			if tc.name == "owner makes private" {
				initial.Visibility = "public"
			}
			u := &visibilityUpdater{stored: initial}
			h := NewAdminEventHandler(u, "")
			r := gin.New()
			var contextEvent models.Event
			r.Use(func(c *gin.Context) {
				contextEvent = u.stored
				c.Set("event", &contextEvent)
				id := user
				if tc.role == "owner" {
					id = owner
				}
				c.Set("user_id", id)
				c.Next()
			})
			r.PUT("/api/admin/events/:slug/features", middleware.AdminMiddleware(accessMembership{
				allowed: tc.role == "collaborator", eventID: initial.ID, userID: user,
			}), h.UpdateEventFeatures)
			w := httptest.NewRecorder()
			req := httptest.NewRequest("PUT", "/api/admin/events/party/features", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)
			require.Equal(t, tc.code, w.Code, w.Body.String())
			expected := initial
			if tc.code != 200 {
				message := "invalid event visibility"
				if tc.code == 403 {
					message = "Not authorized. You are not the owner or a collaborator of this event"
				}
				require.Equal(t, `{"error":"`+message+`"}`, w.Body.String())
				require.Zero(t, u.writes)
				require.Equal(t, initial, contextEvent)
			} else {
				expected.Visibility = tc.visibility
				if strings.HasPrefix(tc.name, "omitted") {
					expected.Features.Quiz = false
					expected.Features.SecretBox = true
					expected.Settings.PostcardStyle = models.PostcardStylePolaroid
					require.Empty(t, u.sentVisibility, "repository must preserve visibility atomically when omitted")
				} else {
					require.Equal(t, tc.visibility, u.sentVisibility)
				}
				require.Equal(t, 1, u.writes)
				body, err := json.Marshal(expected)
				require.NoError(t, err)
				require.Equal(t, string(body), w.Body.String())
			}
			require.Equal(t, expected, u.stored)
		})
	}
}
