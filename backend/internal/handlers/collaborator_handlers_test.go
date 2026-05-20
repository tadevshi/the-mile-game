package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

// ============== MOCKS ==============

type mockCollaboratorRepo struct {
	collaborators []models.Collaborator
	exists        map[string]bool
}

func newMockCollaboratorRepo() *mockCollaboratorRepo {
	return &mockCollaboratorRepo{
		collaborators: []models.Collaborator{},
		exists:        make(map[string]bool),
	}
}

func (m *mockCollaboratorRepo) Create(eventID, userID uuid.UUID) (*models.Collaborator, error) {
	key := eventID.String() + ":" + userID.String()
	if m.exists[key] {
		return m.getByEventAndUser(eventID, userID), nil
	}
	c := &models.Collaborator{
		ID:        uuid.New(),
		EventID:   eventID,
		UserID:    userID,
		CreatedAt: time.Now(),
	}
	m.collaborators = append(m.collaborators, *c)
	m.exists[key] = true
	return c, nil
}

func (m *mockCollaboratorRepo) getByEventAndUser(eventID, userID uuid.UUID) *models.Collaborator {
	for _, c := range m.collaborators {
		if c.EventID == eventID && c.UserID == userID {
			return &c
		}
	}
	return nil
}

func (m *mockCollaboratorRepo) ListByEvent(eventID uuid.UUID) ([]models.Collaborator, error) {
	var result []models.Collaborator
	for _, c := range m.collaborators {
		if c.EventID == eventID {
			result = append(result, c)
		}
	}
	return result, nil
}

func (m *mockCollaboratorRepo) Delete(eventID, userID uuid.UUID) error {
	key := eventID.String() + ":" + userID.String()
	delete(m.exists, key)
	var filtered []models.Collaborator
	for _, c := range m.collaborators {
		if !(c.EventID == eventID && c.UserID == userID) {
			filtered = append(filtered, c)
		}
	}
	m.collaborators = filtered
	return nil
}

func (m *mockCollaboratorRepo) Exists(eventID, userID uuid.UUID) (bool, error) {
	key := eventID.String() + ":" + userID.String()
	return m.exists[key], nil
}

type mockEventRepoForCollaborators struct {
	events       map[string]*models.Event
	inviteTokens map[string]*models.Event
}

func newMockEventRepoForCollaborators() *mockEventRepoForCollaborators {
	return &mockEventRepoForCollaborators{
		events:       make(map[string]*models.Event),
		inviteTokens: make(map[string]*models.Event),
	}
}

func (m *mockEventRepoForCollaborators) AddEvent(event *models.Event) {
	m.events[event.Slug] = event
	if event.InviteToken != nil {
		m.inviteTokens[*event.InviteToken] = event
	}
}

func (m *mockEventRepoForCollaborators) GetBySlug(slug string) (*models.Event, error) {
	event, ok := m.events[slug]
	if !ok {
		return nil, errors.New("event not found")
	}
	return event, nil
}

func (m *mockEventRepoForCollaborators) GetByInviteToken(token string) (*models.Event, error) {
	event, ok := m.inviteTokens[token]
	if !ok {
		return nil, errors.New("event not found")
	}
	return event, nil
}

func (m *mockEventRepoForCollaborators) Update(event *models.Event) error {
	m.events[event.Slug] = event
	if event.InviteToken != nil {
		m.inviteTokens[*event.InviteToken] = event
	}
	return nil
}

// ============== HELPERS ==============

func setupCollaboratorHandler() (*CollaboratorHandler, *mockCollaboratorRepo, *mockEventRepoForCollaborators) {
	collabRepo := newMockCollaboratorRepo()
	eventRepo := newMockEventRepoForCollaborators()
	handler := NewCollaboratorHandler(collabRepo, eventRepo)
	return handler, collabRepo, eventRepo
}

func createTestEventForCollaborators(slug string, ownerID uuid.UUID) *models.Event {
	return &models.Event{
		ID:       uuid.New(),
		Slug:     slug,
		OwnerID:  ownerID,
		Name:     "Test Event",
		Features: models.EventFeatures{Quiz: true, Corkboard: true, SecretBox: false},
		IsActive: true,
	}
}

// ============== TESTS ==============

func TestGetInviteToken_GeneratesNewToken(t *testing.T) {
	handler, _, eventRepo := setupCollaboratorHandler()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForCollaborators("test-event", ownerID)
	eventRepo.AddEvent(event)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/admin/events/:slug/collaborators/invite", handler.GetInviteToken)

	req, _ := http.NewRequest("GET", "/api/admin/events/test-event/collaborators/invite", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var res struct {
		Token    string `json:"token"`
		ShareURL string `json:"share_url"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	require.NoError(t, err)

	assert.NotEmpty(t, res.Token)
	assert.Contains(t, res.ShareURL, "/join/test-event?token=")
}

func TestListCollaborators_Success(t *testing.T) {
	handler, collabRepo, eventRepo := setupCollaboratorHandler()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForCollaborators("test-event", ownerID)
	eventRepo.AddEvent(event)

	// Add collaborators
	user1 := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	user2 := uuid.MustParse("00000000-0000-0000-0000-000000000003")
	collabRepo.Create(event.ID, user1)
	collabRepo.Create(event.ID, user2)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	r.GET("/api/admin/events/:slug/collaborators", handler.ListCollaborators)

	req, _ := http.NewRequest("GET", "/api/admin/events/test-event/collaborators", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var result []models.Collaborator
	err := json.Unmarshal(w.Body.Bytes(), &result)
	require.NoError(t, err)

	assert.Len(t, result, 2)
}

func TestRemoveCollaborator_Success(t *testing.T) {
	handler, collabRepo, eventRepo := setupCollaboratorHandler()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForCollaborators("test-event", ownerID)
	eventRepo.AddEvent(event)

	user1 := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	collabRepo.Create(event.ID, user1)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	r.DELETE("/api/admin/events/:slug/collaborators/:user_id", handler.RemoveCollaborator)

	req, _ := http.NewRequest("DELETE", "/api/admin/events/test-event/collaborators/"+user1.String(), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var res map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &res)
	require.NoError(t, err)
	assert.Equal(t, "Collaborator removed", res["message"])
}

func TestRemoveCollaborator_CannotRemoveOwner(t *testing.T) {
	handler, _, eventRepo := setupCollaboratorHandler()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForCollaborators("test-event", ownerID)
	eventRepo.AddEvent(event)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	r.DELETE("/api/admin/events/:slug/collaborators/:user_id", handler.RemoveCollaborator)

	req, _ := http.NewRequest("DELETE", "/api/admin/events/test-event/collaborators/"+ownerID.String(), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAcceptInvitation_Success(t *testing.T) {
	handler, collabRepo, eventRepo := setupCollaboratorHandler()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForCollaborators("test-event", ownerID)
	token := "invite-token-123"
	event.InviteToken = &token
	eventRepo.AddEvent(event)

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000002")

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	})
	r.POST("/api/collaborators/accept", handler.AcceptInvitation)

	req, _ := http.NewRequest("POST", "/api/collaborators/accept?token=invite-token-123", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var res map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	require.NoError(t, err)
	assert.Equal(t, "Successfully joined event", res["message"])

	// Verify collaborator was created
	exists, _ := collabRepo.Exists(event.ID, userID)
	assert.True(t, exists)
}

func TestAcceptInvitation_OwnerCannotJoin(t *testing.T) {
	handler, _, eventRepo := setupCollaboratorHandler()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := createTestEventForCollaborators("test-event", ownerID)
	token := "invite-token-123"
	event.InviteToken = &token
	eventRepo.AddEvent(event)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", ownerID)
		c.Next()
	})
	r.POST("/api/collaborators/accept", handler.AcceptInvitation)

	req, _ := http.NewRequest("POST", "/api/collaborators/accept?token=invite-token-123", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestAcceptInvitation_InvalidToken(t *testing.T) {
	handler, _, _ := setupCollaboratorHandler()

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000002")

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	})
	r.POST("/api/collaborators/accept", handler.AcceptInvitation)

	req, _ := http.NewRequest("POST", "/api/collaborators/accept?token=invalid-token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestAcceptInvitation_Unauthenticated(t *testing.T) {
	handler, _, _ := setupCollaboratorHandler()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/collaborators/accept", handler.AcceptInvitation)

	req, _ := http.NewRequest("POST", "/api/collaborators/accept?token=some-token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
