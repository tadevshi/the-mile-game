package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/models"
)

type mockGuestRepository struct {
	invitations map[uuid.UUID]*models.GuestInvitation
	members     map[string]models.EventGuest
	listCalls   int
}

func newMockGuestRepository() *mockGuestRepository {
	return &mockGuestRepository{
		invitations: make(map[uuid.UUID]*models.GuestInvitation),
		members:     make(map[string]models.EventGuest),
	}
}

func (m *mockGuestRepository) GetOrCreateInvitation(eventID uuid.UUID) (*models.GuestInvitation, error) {
	if invitation, ok := m.invitations[eventID]; ok {
		return invitation, nil
	}
	invitation := &models.GuestInvitation{EventID: eventID, Token: "guest-token"}
	m.invitations[eventID] = invitation
	return invitation, nil
}

func (m *mockGuestRepository) RotateInvitation(eventID uuid.UUID) (*models.GuestInvitation, error) {
	previous := m.invitations[eventID]
	token := "guest-token-rotated"
	if previous != nil {
		token = previous.Token + "-rotated"
	}
	invitation := &models.GuestInvitation{EventID: eventID, Token: token}
	m.invitations[eventID] = invitation
	return invitation, nil
}

func (m *mockGuestRepository) AcceptInvitation(token string, userID uuid.UUID) (*models.EventGuest, error) {
	var eventID uuid.UUID
	for candidateEventID, invitation := range m.invitations {
		if invitation.Token == token {
			eventID = candidateEventID
			break
		}
	}
	if eventID == uuid.Nil {
		return nil, sql.ErrNoRows
	}
	key := guestMembershipKey(eventID, userID)
	if guest, ok := m.members[key]; ok {
		return &guest, nil
	}
	guest := models.EventGuest{EventID: eventID, UserID: userID, JoinedAt: time.Unix(100, 0).UTC()}
	m.members[key] = guest
	return &guest, nil
}

func (m *mockGuestRepository) ListByEvent(eventID uuid.UUID) ([]models.EventGuest, error) {
	m.listCalls++
	guests := make([]models.EventGuest, 0)
	for _, guest := range m.members {
		if guest.EventID == eventID {
			guests = append(guests, guest)
		}
	}
	return guests, nil
}

func (m *mockGuestRepository) Delete(eventID, userID uuid.UUID) error {
	delete(m.members, guestMembershipKey(eventID, userID))
	return nil
}

func (m *mockGuestRepository) Exists(eventID, userID uuid.UUID) (bool, error) {
	_, exists := m.members[guestMembershipKey(eventID, userID)]
	return exists, nil
}

func guestMembershipKey(eventID, userID uuid.UUID) string {
	return fmt.Sprintf("%s:%s", eventID, userID)
}

type mockGuestAdminCheck struct {
	collaborators map[uuid.UUID]bool
}

func (m *mockGuestAdminCheck) Exists(_ uuid.UUID, userID uuid.UUID) (bool, error) {
	return m.collaborators[userID], nil
}

func createGuestHandlerTestEvent() *models.Event {
	return &models.Event{
		ID:      uuid.New(),
		Slug:    "guest-event",
		OwnerID: uuid.New(),
		Name:    "Guest event",
	}
}

func setupGuestAdminAPI(handler *GuestHandler, event *models.Event, userID uuid.UUID, collaborators map[uuid.UUID]bool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	api := gin.New()
	adminEvents := api.Group("/api/admin/events/:slug")
	adminEvents.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	adminEvents.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	})
	adminEvents.Use(middleware.AdminMiddleware(&mockGuestAdminCheck{collaborators: collaborators}))
	adminEvents.GET("/guests", handler.ListGuests)
	adminEvents.GET("/guests/invite", handler.GetGuestInviteToken)
	adminEvents.POST("/guests/invite", handler.RotateGuestInviteToken)
	adminEvents.DELETE("/guests/:user_id", handler.RemoveGuest)
	return api
}

func setupGuestAcceptanceAPI(handler *GuestHandler, userID *uuid.UUID) *gin.Engine {
	gin.SetMode(gin.TestMode)
	api := gin.New()
	api.POST("/api/guests/accept", func(c *gin.Context) {
		if userID != nil {
			c.Set("user_id", *userID)
		}
		c.Next()
	}, handler.AcceptInvitation)
	return api
}

func TestGuestAdminActionsAllowOwnersAndCollaboratorsButNotGuests(t *testing.T) {
	event := createGuestHandlerTestEvent()
	guestID := uuid.New()
	collaboratorID := uuid.New()
	repo := newMockGuestRepository()
	repo.invitations[event.ID] = &models.GuestInvitation{EventID: event.ID, Token: "guest-token"}
	repo.members[guestMembershipKey(event.ID, guestID)] = models.EventGuest{EventID: event.ID, UserID: guestID}
	handler := NewGuestHandler(repo)

	tests := []struct {
		name          string
		userID        uuid.UUID
		collaborators map[uuid.UUID]bool
		wantStatus    int
	}{
		{name: "owner", userID: event.OwnerID, wantStatus: http.StatusOK},
		{name: "collaborator", userID: collaboratorID, collaborators: map[uuid.UUID]bool{collaboratorID: true}, wantStatus: http.StatusOK},
		{name: "guest membership does not grant administration", userID: guestID, wantStatus: http.StatusForbidden},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			repo.listCalls = 0
			api := setupGuestAdminAPI(handler, event, test.userID, test.collaborators)
			request := httptest.NewRequest(http.MethodGet, "/api/admin/events/guest-event/guests", nil)
			response := httptest.NewRecorder()
			api.ServeHTTP(response, request)
			require.Equal(t, test.wantStatus, response.Code)
			if test.name == "guest membership does not grant administration" {
				assert.Equal(t, 0, repo.listCalls, "admin middleware must reject a guest before reading the guest list")
			}
		})
	}
}

func TestGuestInviteEndpointsUseDedicatedTokenAndRotationPreservesMembers(t *testing.T) {
	event := createGuestHandlerTestEvent()
	guestID := uuid.New()
	repo := newMockGuestRepository()
	repo.members[guestMembershipKey(event.ID, guestID)] = models.EventGuest{EventID: event.ID, UserID: guestID}
	handler := NewGuestHandler(repo)
	api := setupGuestAdminAPI(handler, event, event.OwnerID, nil)
	t.Setenv("APP_BASE_URL", "https://events.example/")

	getRequest := httptest.NewRequest(http.MethodGet, "/api/admin/events/guest-event/guests/invite", nil)
	getResponse := httptest.NewRecorder()
	api.ServeHTTP(getResponse, getRequest)
	require.Equal(t, http.StatusOK, getResponse.Code)
	var first struct {
		Token    string `json:"token"`
		ShareURL string `json:"share_url"`
	}
	require.NoError(t, json.Unmarshal(getResponse.Body.Bytes(), &first))
	assert.Equal(t, "guest-token", first.Token)
	assert.Equal(t, "https://events.example/guest-join/guest-event?token=guest-token", first.ShareURL)

	rotateRequest := httptest.NewRequest(http.MethodPost, "/api/admin/events/guest-event/guests/invite", nil)
	rotateResponse := httptest.NewRecorder()
	api.ServeHTTP(rotateResponse, rotateRequest)
	require.Equal(t, http.StatusOK, rotateResponse.Code)
	var rotated struct {
		Token    string `json:"token"`
		ShareURL string `json:"share_url"`
	}
	require.NoError(t, json.Unmarshal(rotateResponse.Body.Bytes(), &rotated))
	assert.NotEqual(t, first.Token, rotated.Token)
	assert.Contains(t, rotated.ShareURL, "?token="+rotated.Token)
	member, err := repo.Exists(event.ID, guestID)
	require.NoError(t, err)
	assert.True(t, member, "rotating the link must not revoke accepted memberships")
}

func TestAcceptGuestInvitationRequiresAuthenticationAndReturnsNoToken(t *testing.T) {
	event := createGuestHandlerTestEvent()
	repo := newMockGuestRepository()
	repo.invitations[event.ID] = &models.GuestInvitation{EventID: event.ID, Token: "guest-token"}
	handler := NewGuestHandler(repo)
	userID := uuid.New()

	tests := []struct {
		name       string
		path       string
		userID     *uuid.UUID
		wantStatus int
	}{
		{name: "missing token", path: "/api/guests/accept", userID: &userID, wantStatus: http.StatusBadRequest},
		{name: "anonymous", path: "/api/guests/accept?token=guest-token", wantStatus: http.StatusUnauthorized},
		{name: "invalid token", path: "/api/guests/accept?token=expired", userID: &userID, wantStatus: http.StatusNotFound},
		{name: "valid token", path: "/api/guests/accept?token=guest-token", userID: &userID, wantStatus: http.StatusOK},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			api := setupGuestAcceptanceAPI(handler, test.userID)
			request := httptest.NewRequest(http.MethodPost, test.path, nil)
			response := httptest.NewRecorder()
			api.ServeHTTP(response, request)
			require.Equal(t, test.wantStatus, response.Code)
			if test.name == "valid token" {
				var body map[string]any
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
				assert.Equal(t, event.ID.String(), body["event_id"])
				assert.Equal(t, userID.String(), body["user_id"])
				assert.NotContains(t, body, "token")
			}
		})
	}
}
