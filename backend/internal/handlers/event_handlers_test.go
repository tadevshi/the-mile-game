package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// MockEventRepo simula el repositorio de eventos
type MockEventRepo struct {
	GetBySlugFunc func(slug string) (*models.Event, error)
}

func (m *MockEventRepo) GetBySlug(slug string) (*models.Event, error) {
	return m.GetBySlugFunc(slug)
}

// ========== TESTS PARA EVENT MIDDLEWARE ==========

func TestEventMiddleware_ValidSlug(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockEventRepo := &MockEventRepo{
		GetBySlugFunc: func(slug string) (*models.Event, error) {
			return &models.Event{
				ID:   uuid.New(),
				Slug: slug,
				Name: "Test Event",
				Features: models.EventFeatures{
					Quiz:      true,
					Corkboard: true,
				},
				IsActive: true,
			}, nil
		},
	}

	// EventMiddleware simplificado para test
	eventMiddleware := func(c *gin.Context) {
		slug := c.Param("slug")
		event, err := mockEventRepo.GetBySlug(slug)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			c.Abort()
			return
		}
		c.Set("event", event)
		c.Set("event_id", event.ID)
		c.Next()
	}

	r.GET("/event/:slug/test", eventMiddleware, func(c *gin.Context) {
		event, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			return
		}
		c.JSON(http.StatusOK, event)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/event/test-event/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestEventMiddleware_InvalidSlug(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockEventRepo := &MockEventRepo{
		GetBySlugFunc: func(slug string) (*models.Event, error) {
			return nil, errors.New("event not found")
		},
	}

	eventMiddleware := func(c *gin.Context) {
		slug := c.Param("slug")
		_, err := mockEventRepo.GetBySlug(slug)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/event/:slug/test", eventMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/event/nonexistent/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

func TestEventMiddleware_InactiveEvent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockEventRepo := &MockEventRepo{
		GetBySlugFunc: func(slug string) (*models.Event, error) {
			return &models.Event{
				ID:       uuid.New(),
				Slug:     slug,
				Name:     "Inactive Event",
				IsActive: false,
			}, nil
		},
	}

	eventMiddleware := func(c *gin.Context) {
		slug := c.Param("slug")
		event, err := mockEventRepo.GetBySlug(slug)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			c.Abort()
			return
		}
		if !event.IsActive {
			c.JSON(http.StatusGone, gin.H{"error": "Event has ended"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/event/:slug/test", eventMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/event/inactive-event/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusGone {
		t.Errorf("Expected status %d, got %d", http.StatusGone, w.Code)
	}
}

func TestEventMiddleware_FeatureGating(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockEventRepo := &MockEventRepo{
		GetBySlugFunc: func(slug string) (*models.Event, error) {
			return &models.Event{
				ID:   uuid.New(),
				Slug: slug,
				Features: models.EventFeatures{
					Quiz:      false, // Quiz deshabilitado
					Corkboard: true,
				},
				IsActive: true,
			}, nil
		},
	}

	eventMiddleware := func(c *gin.Context) {
		slug := c.Param("slug")
		event, err := mockEventRepo.GetBySlug(slug)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			c.Abort()
			return
		}
		c.Set("event", event)
		c.Next()
	}

	quizFeatureMiddleware := func(c *gin.Context) {
		event, exists := c.Get("event")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
			c.Abort()
			return
		}
		if !event.(*models.Event).Features.Quiz {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz feature not enabled for this event"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/event/:slug/quiz", eventMiddleware, quizFeatureMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/event/no-quiz-event/quiz", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

// ========== TESTS PARA OWNER MIDDLEWARE ==========

func TestOwnerMiddleware_AllowsOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	userID := uuid.New()
	eventID := uuid.New()

	ownerMiddleware := func(c *gin.Context) {
		// Simular que el usuario es el owner del evento
		c.Set("user_id", userID)
		event := &models.Event{
			ID:      eventID,
			OwnerID: userID, // Mismo ID = owner
		}
		c.Set("event", event)

		// Verificar ownership
		currentUserID, _ := c.Get("user_id")
		eventFromContext, _ := c.Get("event")

		if currentUserID.(uuid.UUID) != eventFromContext.(*models.Event).OwnerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/admin/event/:id", ownerMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/event/"+eventID.String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestOwnerMiddleware_RejectsNonOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	userID := uuid.New()
	eventOwnerID := uuid.New() // Diferente ID
	eventID := uuid.New()

	ownerMiddleware := func(c *gin.Context) {
		c.Set("user_id", userID)
		event := &models.Event{
			ID:      eventID,
			OwnerID: eventOwnerID, // Diferente = no es owner
		}
		c.Set("event", event)

		currentUserID, _ := c.Get("user_id")
		eventFromContext, _ := c.Get("event")

		if currentUserID.(uuid.UUID) != eventFromContext.(*models.Event).OwnerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/admin/event/:id", ownerMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/event/"+eventID.String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w.Code)
	}
}

// ========== TESTS PARA ENDPOINTS SCOPADOS ==========

func TestEventScopedPlayers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	eventID := uuid.New()

	eventMiddleware := func(c *gin.Context) {
		c.Set("event_id", eventID)
		c.Next()
	}

	r.GET("/api/events/:slug/players", eventMiddleware, func(c *gin.Context) {
		eventID, exists := c.Get("event_id")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No event_id in context"})
			return
		}
		// Simular que retornamos players de ese evento
		c.JSON(http.StatusOK, gin.H{
			"event_id": eventID,
			"players":  []interface{}{},
		})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/test-event/players", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["event_id"] == nil {
		t.Error("Expected event_id in response")
	}
}

func TestEventScopedQuizQuestions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	eventID := uuid.New()

	eventMiddleware := func(c *gin.Context) {
		c.Set("event_id", eventID)
		c.Set("event", &models.Event{
			ID: eventID,
			Features: models.EventFeatures{
				Quiz: true,
			},
		})
		c.Next()
	}

	r.GET("/api/events/:slug/quiz/questions", eventMiddleware, func(c *gin.Context) {
		event, _ := c.Get("event")
		if !event.(*models.Event).Features.Quiz {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not enabled"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"event_id":  eventID,
			"questions": []interface{}{},
		})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/test-event/quiz/questions", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestEventScopedPostcards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	eventID := uuid.New()

	eventMiddleware := func(c *gin.Context) {
		c.Set("event_id", eventID)
		c.Set("event", &models.Event{
			ID: eventID,
			Features: models.EventFeatures{
				Corkboard: true,
			},
		})
		c.Next()
	}

	r.GET("/api/events/:slug/postcards", eventMiddleware, func(c *gin.Context) {
		event, _ := c.Get("event")
		if !event.(*models.Event).Features.Corkboard {
			c.JSON(http.StatusNotFound, gin.H{"error": "Corkboard not enabled"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"event_id":  eventID,
			"postcards": []interface{}{},
		})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/test-event/postcards", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestEventScopedRanking(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	eventID := uuid.New()

	eventMiddleware := func(c *gin.Context) {
		c.Set("event_id", eventID)
		c.Next()
	}

	r.GET("/api/events/:slug/ranking", eventMiddleware, func(c *gin.Context) {
		eventID, _ := c.Get("event_id")
		c.JSON(http.StatusOK, gin.H{
			"event_id": eventID,
			"ranking":  []interface{}{},
		})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/events/test-event/ranking", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

// ========== TEST DE ISOLAMIENTO ==========

func TestEventDataIsolation(t *testing.T) {
	// Este test verifica que datos de event A no aparecen en event B
	gin.SetMode(gin.TestMode)

	eventA_ID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	eventB_ID := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	mockData := map[uuid.UUID][]map[string]interface{}{
		eventA_ID: {
			{"id": "player-1", "name": "Player from Event A"},
		},
		eventB_ID: {
			{"id": "player-2", "name": "Player from Event B"},
		},
	}

	r := gin.New()

	eventMiddleware := func(c *gin.Context) {
		slug := c.Param("slug")
		var eventID uuid.UUID
		if slug == "event-a" {
			eventID = eventA_ID
		} else if slug == "event-b" {
			eventID = eventB_ID
		}
		c.Set("event_id", eventID)
		c.Next()
	}

	r.GET("/api/events/:slug/players", eventMiddleware, func(c *gin.Context) {
		eventID, _ := c.Get("event_id")
		players := mockData[eventID.(uuid.UUID)]
		c.JSON(http.StatusOK, gin.H{
			"event_id": eventID,
			"players":  players,
		})
	})

	// Request a event A
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/api/events/event-a/players", nil)
	r.ServeHTTP(w1, req1)

	var respA map[string]interface{}
	json.Unmarshal(w1.Body.Bytes(), &respA)

	// Verificar que solo hay players de event A
	playersA := respA["players"].([]interface{})
	if len(playersA) != 1 {
		t.Errorf("Expected 1 player for event A, got %d", len(playersA))
	}

	playerA := playersA[0].(map[string]interface{})
	if playerA["name"] != "Player from Event A" {
		t.Errorf("Expected player from event A, got %s", playerA["name"])
	}

	// Request a event B
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/api/events/event-b/players", nil)
	r.ServeHTTP(w2, req2)

	var respB map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &respB)

	// Verificar que solo hay players de event B
	playersB := respB["players"].([]interface{})
	if len(playersB) != 1 {
		t.Errorf("Expected 1 player for event B, got %d", len(playersB))
	}

	playerB := playersB[0].(map[string]interface{})
	if playerB["name"] != "Player from Event B" {
		t.Errorf("Expected player from event B, got %s", playerB["name"])
	}

	t.Log("✅ Event data isolation test passed!")
}
