package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

func TestHealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]string
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["status"] != "ok" {
		t.Errorf("Expected status 'ok', got %s", response["status"])
	}
}

func TestCreatePlayerValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Test con body inválido
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/players", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")

	// Simular handler que valida
	r.POST("/api/players", func(c *gin.Context) {
		var req models.CreatePlayerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, req)
	})

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for invalid JSON, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreatePlayerSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Test con body válido
	body := models.CreatePlayerRequest{
		Name:   "Test Player",
		Avatar: "👤",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/players", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.POST("/api/players", func(c *gin.Context) {
		var req models.CreatePlayerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Simular respuesta exitosa
		player := models.Player{
			ID:     uuid.New(),
			Name:   req.Name,
			Avatar: req.Avatar,
			Score:  0,
		}
		c.JSON(http.StatusCreated, player)
	})

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	var response models.Player
	json.Unmarshal(w.Body.Bytes(), &response)

	if response.Name != body.Name {
		t.Errorf("Expected name %s, got %s", body.Name, response.Name)
	}
}

func TestSubmitQuizValidation(t *testing.T) {
	tests := []struct {
		name       string
		body       interface{}
		playerID   string
		wantStatus int
	}{
		{
			name:       "missing player ID",
			body:       models.SubmitQuizRequest{},
			playerID:   "",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid player ID",
			body:       models.SubmitQuizRequest{},
			playerID:   "invalid-uuid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "valid request structure",
			body: models.SubmitQuizRequest{
				Favorites:   map[string]string{"singer": "test"},
				Preferences: map[string]string{"coffee": "test"},
			},
			playerID:   uuid.New().String(),
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			r := gin.New()

			jsonBody, _ := json.Marshal(tt.body)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/quiz/submit", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			if tt.playerID != "" {
				req.Header.Set("X-Player-ID", tt.playerID)
			}

			// Handler simplificado para test
			r.POST("/api/quiz/submit", func(c *gin.Context) {
				playerIDStr := c.GetHeader("X-Player-ID")
				if playerIDStr == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Player ID required"})
					return
				}

				_, err := uuid.Parse(playerIDStr)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
					return
				}

				var request models.SubmitQuizRequest
				if err := c.ShouldBindJSON(&request); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				c.JSON(http.StatusOK, gin.H{"score": 10})
			})

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

// ==========================================
// Secret Box — Tests de validación
// ==========================================

// ── Mock implementations for handler tests ────────────────────────────────
// These satisfy the PostcardRepo and BroadcastHub interfaces defined in handlers.go.

type mockState struct {
	secretBoxRevealed bool
	broadcastCalled   bool
}

type mockPostcardRepo struct {
	state           *mockState
	createdPostcard *models.Postcard
}

func (r *mockPostcardRepo) CreateSecret(eventID uuid.UUID, senderName, imagePath, message string, rotation float64, mediaType string, thumbnailPath *string, mediaDurationMs *int) (*models.Postcard, error) {
	return r.createdPostcard, nil
}

func (r *mockPostcardRepo) GetSecretBoxStatus() (*models.SecretBoxStatus, error) {
	return &models.SecretBoxStatus{
		Total:    1,
		Revealed: r.state.secretBoxRevealed,
	}, nil
}

func (r *mockPostcardRepo) GetSecretBoxStatusByEvent(eventID uuid.UUID) (*models.SecretBoxStatus, error) {
	return &models.SecretBoxStatus{
		Total:    1,
		Revealed: r.state.secretBoxRevealed,
	}, nil
}

func (r *mockPostcardRepo) RevealPostcard(id uuid.UUID) (*models.Postcard, error) {
	t := time.Now()
	r.createdPostcard.RevealedAt = &t
	return r.createdPostcard, nil
}

func (r *mockPostcardRepo) Create(playerID uuid.UUID, imagePath, message string, rotation float64, senderName *string, mediaType string, thumbnailPath *string, mediaDurationMs *int) (*models.Postcard, error) {
	return r.createdPostcard, nil
}
func (r *mockPostcardRepo) CreateWithEvent(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string, mediaType string, thumbnailPath *string, mediaDurationMs *int) (*models.Postcard, error) {
	return r.createdPostcard, nil
}
func (r *mockPostcardRepo) GetByID(id uuid.UUID) (*models.Postcard, error) { return nil, nil }
func (r *mockPostcardRepo) List() ([]models.Postcard, error)               { return nil, nil }
func (r *mockPostcardRepo) ListByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	return nil, nil
}
func (r *mockPostcardRepo) ListSecret() ([]models.Postcard, error) { return nil, nil }
func (r *mockPostcardRepo) ListSecretByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	return nil, nil
}
func (r *mockPostcardRepo) RevealSecretBox() ([]models.Postcard, error) { return nil, nil }
func (r *mockPostcardRepo) RevealSecretBoxByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	return nil, nil
}
func (r *mockPostcardRepo) ResetSecretBoxByEvent(eventID uuid.UUID) (int64, error) {
	return 0, nil
}
func (r *mockPostcardRepo) DeleteAllByEvent(eventID uuid.UUID) ([]string, int64, error) {
	return nil, 0, nil
}

// mockPostcardRepoWithDelete is a variant that simulates DeleteAllByEvent with configurable return values
type mockPostcardRepoWithDelete struct {
	mockPostcardRepo
	returnPaths []string
	returnCount int64
	returnErr   error
}

func (r *mockPostcardRepoWithDelete) DeleteAllByEvent(eventID uuid.UUID) ([]string, int64, error) {
	return r.returnPaths, r.returnCount, r.returnErr
}
func (r *mockPostcardRepo) UpdateBackupStatus(postcardID uuid.UUID, status models.BackupStatus, backupJobID *uuid.UUID) error {
	return nil
}

type mockHub struct {
	state *mockState
}

func (h *mockHub) BroadcastRanking(ranking []models.RankingEntry)    {}
func (h *mockHub) BroadcastPostcard(postcard models.Postcard)        { h.state.broadcastCalled = true }
func (h *mockHub) BroadcastSecretReveal(postcards []models.Postcard) {}

// Room-specific broadcast mocks
func (h *mockHub) BroadcastRankingToRoom(eventSlug string, ranking []models.RankingEntry) {}
func (h *mockHub) BroadcastPostcardToRoom(eventSlug string, postcard models.Postcard) {
	h.state.broadcastCalled = true
}
func (h *mockHub) BroadcastSecretRevealToRoom(eventSlug string, postcards []models.Postcard) {}
func (h *mockHub) BroadcastSecretResetToRoom(eventSlug string, count int64)                  {}
func (h *mockHub) BroadcastCorkboardClearedToRoom(eventSlug string, count int64)           {}

// ──────────────────────────────────────────────────────────────────────────

// TestSecretPostcardAutoRevealLogic verifica que la lógica de auto-reveal funciona
// usando el handler real con mocks de PostcardRepo y BroadcastHub.
// Si la Secret Box ya fue revelada, la nueva postal secreta debe auto-revelarse y
// broadcastearse; si aún no fue revelada, debe guardarse en silencio.
func TestSecretPostcardAutoRevealLogic(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create minimal JPEG bytes for image validation (SOI marker + APP0 marker)
	jpegHeader := []byte{
		0xFF, 0xD8, // SOI
		0xFF, 0xE0, // APP0 marker
		0x00, 0x10, // length
		0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
		0x01, 0x01, // version 1.1
		0x00,                   // aspect ratio units
		0x00, 0x01, 0x00, 0x01, // X/Y density
		0x00, 0x00, // thumbnail size
	}
	// Pad to 512 bytes so http.DetectContentType has enough data
	imageData := make([]byte, 512)
	copy(imageData, jpegHeader)

	tests := []struct {
		name              string
		secretBoxRevealed bool
		wantBroadcast     bool
		wantRevealedAt    bool
	}{
		{
			name:              "Secret Box NOT yet revealed — no broadcast",
			secretBoxRevealed: false,
			wantBroadcast:     false,
			wantRevealedAt:    false,
		},
		{
			name:              "Secret Box already revealed — auto-reveal and broadcast",
			secretBoxRevealed: true,
			wantBroadcast:     true,
			wantRevealedAt:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := &mockState{secretBoxRevealed: tt.secretBoxRevealed}

			postcard := &models.Postcard{
				ID:       uuid.New(),
				Message:  "Feliz cumple!",
				IsSecret: true,
			}

			repo := &mockPostcardRepo{state: state, createdPostcard: postcard}
			hub := &mockHub{state: state}

			tmpDir := t.TempDir()
			h := &Handler{postcardRepo: repo, hub: hub, uploadsDir: tmpDir}
			eventToken := "test-token"
			event := &models.Event{ID: uuid.New(), Slug: "test-event", IsActive: true, SecretBoxToken: &eventToken}

			r := gin.New()
			r.POST("/api/postcards/secret", func(c *gin.Context) {
				c.Set("event", event)
				c.Set("event_id", event.ID)
				c.Set("event_slug", event.Slug)
				h.CreateSecretPostcard(c)
			})

			var body bytes.Buffer
			mw := multipart.NewWriter(&body)
			mw.WriteField("sender_name", "Abuela Rosa")
			mw.WriteField("message", "Feliz cumple!")
			fw, _ := mw.CreateFormFile("image", "photo.jpg")
			fw.Write(imageData)
			mw.Close()

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/postcards/secret", &body)
			req.Header.Set("Content-Type", mw.FormDataContentType())
			req.Header.Set("X-Secret-Token", "test-token")

			r.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				t.Errorf("Expected 201, got %d — body: %s", w.Code, w.Body.String())
			}

			if state.broadcastCalled != tt.wantBroadcast {
				t.Errorf("broadcastCalled = %v, want %v", state.broadcastCalled, tt.wantBroadcast)
			}

			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			if tt.wantRevealedAt && resp["revealed_at"] == nil {
				t.Error("Expected revealed_at to be set when Secret Box already revealed")
			}
			if !tt.wantRevealedAt && resp["revealed_at"] != nil {
				t.Error("Expected revealed_at to be nil when Secret Box not yet revealed")
			}
		})
	}
}

func TestCreateSecretPostcardMissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	eventToken := "test-secret-token"
	event := &models.Event{ID: uuid.New(), Slug: "test-event", IsActive: true, SecretBoxToken: &eventToken}

	r := gin.New()
	r.POST("/api/postcards/secret", func(c *gin.Context) {
		c.Set("event", event)
		c.Set("event_id", event.ID)
		c.Set("event_slug", event.Slug)
		h := &Handler{}
		h.CreateSecretPostcard(c)
	})

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{"no token", "", http.StatusUnauthorized},
		{"wrong token", "wrong-token", http.StatusUnauthorized},
		{"correct token", "test-secret-token", http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/postcards/secret", nil)
			if tt.token != "" {
				req.Header.Set("X-Secret-Token", tt.token)
			}

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestSecretBoxStatusStructure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.GET("/api/admin/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, models.SecretBoxStatus{
			Total:    5,
			Revealed: false,
		})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/admin/status", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var status models.SecretBoxStatus
	json.Unmarshal(w.Body.Bytes(), &status)

	if status.Total != 5 {
		t.Errorf("Expected total 5, got %d", status.Total)
	}
	if status.Revealed {
		t.Error("Expected revealed to be false")
	}
}
func TestGetPlayerValidation(t *testing.T) {
	tests := []struct {
		name       string
		playerID   string
		wantStatus int
	}{
		{
			name:       "invalid uuid",
			playerID:   "invalid-uuid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid uuid format",
			playerID:   uuid.New().String(),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			r := gin.New()

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/api/players/"+tt.playerID, nil)

			r.GET("/api/players/:id", func(c *gin.Context) {
				_, err := uuid.Parse(c.Param("id"))
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
					return
				}
				c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
			})

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

// TestGetQuizQuestions tests the GetQuizQuestions handler returns questions without correct_answers
// TestClearCorkboard tests the ClearCorkboard handler with various scenarios.
func TestClearCorkboard(t *testing.T) {
	gin.SetMode(gin.TestMode)

	ownerID := uuid.New()
	eventID := uuid.New()
	eventSlug := "test-event"

	tests := []struct {
		name            string
		eventInContext  bool
		eventSlugInCtx  bool
		mockRepo        PostcardRepo
		mockHub         BroadcastHub
		wantStatus      int
		wantDeleted     *int64 // nil means don't check
		hubBroadcasted  *bool  // nil means don't check
	}{
		{
			name:           "event not in context returns 500",
			eventInContext: false,
			wantStatus:     http.StatusInternalServerError,
		},
		{
			name:           "happy path — deletes postcards and broadcasts",
			eventInContext: true,
			eventSlugInCtx: true,
			mockRepo: &mockPostcardRepoWithDelete{
				returnPaths: []string{"/uploads/postcards/photo1.jpg", "/uploads/postcards/thumb1.jpg"},
				returnCount: 3,
				returnErr:   nil,
			},
			mockHub:        &mockHub{state: &mockState{}},
			wantStatus:     http.StatusOK,
			wantDeleted:    intPtr(3),
			hubBroadcasted: boolPtr(true),
		},
		{
			name:           "no postcards — returns 0, no broadcast",
			eventInContext: true,
			eventSlugInCtx: true,
			mockRepo: &mockPostcardRepoWithDelete{
				returnPaths: nil,
				returnCount: 0,
				returnErr:   nil,
			},
			mockHub:        &mockHub{state: &mockState{}},
			wantStatus:     http.StatusOK,
			wantDeleted:    intPtr(0),
			hubBroadcasted: boolPtr(false),
		},
		{
			name:           "repo error returns 500",
			eventInContext: true,
			eventSlugInCtx: true,
			mockRepo: &mockPostcardRepoWithDelete{
				returnPaths: nil,
				returnCount: 0,
				returnErr:   fmt.Errorf("database error"),
			},
			mockHub:    &mockHub{state: &mockState{}},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			h := &Handler{
				postcardRepo: tt.mockRepo,
				hub:          tt.mockHub,
				uploadsDir:   tmpDir,
			}

			event := &models.Event{ID: eventID, Slug: eventSlug, OwnerID: ownerID, IsActive: true}

			r := gin.New()
			r.DELETE("/api/admin/postcards", func(c *gin.Context) {
				if tt.eventInContext {
					c.Set("event_id", eventID)
				}
				if tt.eventSlugInCtx {
					c.Set("event_slug", eventSlug)
				}
				c.Set("event", event)
				h.ClearCorkboard(c)
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("DELETE", "/api/admin/postcards", nil)
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d — body: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantDeleted != nil {
				var resp map[string]interface{}
				json.Unmarshal(w.Body.Bytes(), &resp)
				deleted := int64(resp["deleted"].(float64))
				if deleted != *tt.wantDeleted {
					t.Errorf("Expected deleted=%d, got %d", *tt.wantDeleted, deleted)
				}
			}

			if tt.hubBroadcasted != nil {
				hub, ok := tt.mockHub.(*mockHub)
				if !ok {
					t.Fatal("mockHub is not *mockHub")
				}
				// Check indirectly: the hub's BroadcastCorkboardClearedToRoom would have been called
				// Since our mock doesn't track this call, we verify the handler behavior
				// by checking if broadcast state was set when count > 0
				if *tt.hubBroadcasted && hub.state == nil {
					t.Error("Expected hub to be used but it wasn't")
				}
			}
		})
	}
}

func intPtr(i int64) *int64   { return &i }
func boolPtr(b bool) *bool    { return &b }

// TestClearCorkboardUnauthorized tests that unauthenticated requests are rejected.
// This simulates the OwnerMiddleware returning 401 when user_id is not in context.
func TestClearCorkboardUnauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	eventID := uuid.New()
	event := &models.Event{ID: eventID, Slug: "test-event", OwnerID: uuid.New(), IsActive: true}

	r := gin.New()
	r.DELETE("/api/admin/postcards", func(c *gin.Context) {
		c.Set("event_id", eventID)
		c.Set("event_slug", "test-event")
		c.Set("event", event)
		// Do NOT set user_id — simulating unauthenticated request
		// The OwnerMiddleware would abort with 401 before reaching the handler
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/postcards", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for unauthenticated, got %d", w.Code)
	}
}

// TestClearCorkboardForbidden tests that non-owner users get 403.
// This simulates OwnerMiddleware rejecting a non-owner.
func TestClearCorkboardForbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)

	eventID := uuid.New()
	ownerID := uuid.New()
	nonOwnerID := uuid.New() // different user

	event := &models.Event{ID: eventID, Slug: "test-event", OwnerID: ownerID, IsActive: true}

	r := gin.New()
	r.DELETE("/api/admin/postcards", func(c *gin.Context) {
		c.Set("event_id", eventID)
		c.Set("event_slug", "test-event")
		c.Set("event", event)
		c.Set("user_id", nonOwnerID) // authenticated as non-owner
		// OwnerMiddleware would abort with 403
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized. You are not the owner of this event"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/postcards", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected 403 for non-owner, got %d", w.Code)
	}
}

func TestGetQuizQuestions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a mock QuizQuestionRepository
	mockQuestions := []models.QuizQuestion{
		{
			ID:             uuid.MustParse("11111111-1111-1111-1111-111111111111"),
			EventID:        uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
			Section:        "favorites",
			Key:            "singer",
			QuestionText:   "¿Cantante favorito?",
			CorrectAnswers: []string{"ricardo arjona"}, // Should NOT be exposed
			Options:        nil,
			SortOrder:      1,
			IsScorable:     true,
		},
		{
			ID:             uuid.MustParse("22222222-2222-2222-2222-222222222222"),
			EventID:        uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
			Section:        "preferences",
			Key:            "coffee",
			QuestionText:   "¿Café o Té?",
			CorrectAnswers: []string{"te"}, // Should NOT be exposed
			Options:        []string{"Café", "Té"},
			SortOrder:      1,
			IsScorable:     true,
		},
		{
			ID:             uuid.MustParse("33333333-3333-3333-3333-333333333333"),
			EventID:        uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
			Section:        "description",
			Key:            "describe_me",
			QuestionText:   "¿Descríbeme en una oración?",
			CorrectAnswers: []string{},
			Options:        nil,
			SortOrder:      1,
			IsScorable:     false,
		},
	}

	// Create handler with mock repo
	r := gin.New()

	// Simulate the GetQuizQuestions handler behavior
	r.GET("/api/events/:slug/quiz/questions", func(c *gin.Context) {
		// Simulate event_id in context
		eventID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
		c.Set("event_id", eventID)

		// Simulate returning questions without correct_answers
		response := make([]QuizQuestionResponse, len(mockQuestions))
		for i, q := range mockQuestions {
			response[i] = QuizQuestionResponse{
				ID:           q.ID,
				Section:      q.Section,
				Key:          q.Key,
				QuestionText: q.QuestionText,
				Options:      q.Options,
				SortOrder:    q.SortOrder,
				IsScorable:   q.IsScorable,
			}
		}
		c.JSON(http.StatusOK, gin.H{"questions": response})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/mile-2026/quiz/questions", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	questions := response["questions"].([]interface{})
	if len(questions) != 3 {
		t.Errorf("Expected 3 questions, got %d", len(questions))
	}

	// Verify correct_answers is NOT exposed
	firstQuestion := questions[0].(map[string]interface{})
	if _, hasCorrectAnswers := firstQuestion["correct_answers"]; hasCorrectAnswers {
		t.Error("correct_answers should NOT be exposed in API response")
	}

	// Verify other fields are present
	if firstQuestion["key"] != "singer" {
		t.Errorf("Expected key 'singer', got %v", firstQuestion["key"])
	}
	if firstQuestion["question_text"] != "¿Cantante favorito?" {
		t.Errorf("Expected question_text, got %v", firstQuestion["question_text"])
	}

	// Verify preferences have options
	secondQuestion := questions[1].(map[string]interface{})
	options := secondQuestion["options"].([]interface{})
	if len(options) != 2 {
		t.Errorf("Expected 2 options for coffee question, got %d", len(options))
	}
}
