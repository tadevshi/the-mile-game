package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

type visibilityMembershipChecker struct {
	exists  bool
	err     error
	calls   int
	eventID uuid.UUID
	userID  uuid.UUID
}

func (m *visibilityMembershipChecker) Exists(eventID, userID uuid.UUID) (bool, error) {
	m.calls++
	m.eventID = eventID
	m.userID = userID
	return m.exists, m.err
}

func TestEventVisibilityMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ownerID := uuid.New()
	memberID := uuid.New()
	databaseErr := errors.New("membership database unavailable")

	tests := []struct {
		name                  string
		isPublic              bool
		userID                any
		collaboratorExists    bool
		guestExists           bool
		collaboratorErr       error
		guestErr              error
		wantStatus            int
		wantBody              string
		wantNext              bool
		wantCollaboratorCalls int
		wantGuestCalls        int
	}{
		{
			name:       "public event remains anonymous",
			isPublic:   true,
			wantStatus: http.StatusOK,
			wantBody:   "allowed",
			wantNext:   true,
		},
		{
			name:       "private event requires an account",
			wantStatus: http.StatusUnauthorized,
			wantBody:   "{\"error\":\"Authentication required\"}",
		},
		{
			name:       "private event allows its owner without membership lookup",
			userID:     ownerID,
			wantStatus: http.StatusOK,
			wantBody:   "allowed",
			wantNext:   true,
		},
		{
			name:                  "private event allows collaborator",
			userID:                memberID,
			collaboratorExists:    true,
			wantStatus:            http.StatusOK,
			wantBody:              "allowed",
			wantNext:              true,
			wantCollaboratorCalls: 1,
		},
		{
			name:                  "private event allows accepted guest without admin rights",
			userID:                memberID,
			guestExists:           true,
			wantStatus:            http.StatusOK,
			wantBody:              "allowed",
			wantNext:              true,
			wantCollaboratorCalls: 1,
			wantGuestCalls:        1,
		},
		{
			name:                  "private event denies unrelated account",
			userID:                memberID,
			wantStatus:            http.StatusForbidden,
			wantBody:              "{\"error\":\"Not authorized to view this event\"}",
			wantCollaboratorCalls: 1,
			wantGuestCalls:        1,
		},
		{
			name:                  "collaborator lookup failure fails closed",
			userID:                memberID,
			collaboratorErr:       databaseErr,
			wantStatus:            http.StatusInternalServerError,
			wantBody:              "{\"error\":\"Failed to verify event access\"}",
			wantCollaboratorCalls: 1,
		},
		{
			name:                  "guest lookup failure fails closed",
			userID:                memberID,
			guestErr:              databaseErr,
			wantStatus:            http.StatusInternalServerError,
			wantBody:              "{\"error\":\"Failed to verify event access\"}",
			wantCollaboratorCalls: 1,
			wantGuestCalls:        1,
		},
		{
			name:       "private event rejects malformed identity context",
			userID:     "not-a-uuid",
			wantStatus: http.StatusUnauthorized,
			wantBody:   "{\"error\":\"Authentication required\"}",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &models.Event{ID: uuid.New(), OwnerID: ownerID, IsPublic: tt.isPublic}
			collaborators := &visibilityMembershipChecker{exists: tt.collaboratorExists, err: tt.collaboratorErr}
			guests := &visibilityMembershipChecker{exists: tt.guestExists, err: tt.guestErr}
			nextCalled := false

			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("event", event)
				if tt.userID != nil {
					c.Set("user_id", tt.userID)
				}
				c.Next()
			})
			router.Use(EventVisibilityMiddleware(collaborators, guests))
			router.GET("/content", func(c *gin.Context) {
				nextCalled = true
				c.String(http.StatusOK, "allowed")
			})

			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/content", nil)
			router.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d; body=%s", response.Code, tt.wantStatus, response.Body.String())
			}
			if response.Body.String() != tt.wantBody {
				t.Errorf("body = %q, want %q", response.Body.String(), tt.wantBody)
			}
			if nextCalled != tt.wantNext {
				t.Errorf("next called = %v, want %v", nextCalled, tt.wantNext)
			}
			if collaborators.calls != tt.wantCollaboratorCalls {
				t.Errorf("collaborator lookup calls = %d, want %d", collaborators.calls, tt.wantCollaboratorCalls)
			}
			if guests.calls != tt.wantGuestCalls {
				t.Errorf("guest lookup calls = %d, want %d", guests.calls, tt.wantGuestCalls)
			}
			if collaborators.calls > 0 && (collaborators.eventID != event.ID || collaborators.userID != memberID) {
				t.Errorf("collaborator lookup used event/user %s/%s, want %s/%s", collaborators.eventID, collaborators.userID, event.ID, memberID)
			}
			if guests.calls > 0 && (guests.eventID != event.ID || guests.userID != memberID) {
				t.Errorf("guest lookup used event/user %s/%s, want %s/%s", guests.eventID, guests.userID, event.ID, memberID)
			}
		})
	}
}
