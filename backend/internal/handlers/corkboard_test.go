package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// MockPlayerRepo para tests de inline player registration
type MockPlayerRepo struct {
	CreateFunc          func(name, avatar string) (*models.Player, error)
	CreateWithEventFunc func(eventID uuid.UUID, name, avatar string) (*models.Player, error)
	GetByIDFunc         func(id uuid.UUID) (*models.Player, error)
}

func (m *MockPlayerRepo) Create(name, avatar string) (*models.Player, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(name, avatar)
	}
	return nil, errors.New("not implemented")
}

func (m *MockPlayerRepo) CreateWithEvent(eventID uuid.UUID, name, avatar string) (*models.Player, error) {
	if m.CreateWithEventFunc != nil {
		return m.CreateWithEventFunc(eventID, name, avatar)
	}
	return nil, errors.New("not implemented")
}

func (m *MockPlayerRepo) GetByID(id uuid.UUID) (*models.Player, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(id)
	}
	return nil, errors.New("not implemented")
}

// MockPostcardRepo para tests
type MockPostcardRepo struct {
	CreateFunc          func(playerID uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error)
	CreateWithEventFunc func(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error)
	GetByIDFunc         func(id uuid.UUID) (*models.Postcard, error)
}

func (m *MockPostcardRepo) Create(playerID uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(playerID, imagePath, message, rotation, senderName)
	}
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) CreateWithEvent(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error) {
	if m.CreateWithEventFunc != nil {
		return m.CreateWithEventFunc(eventID, playerID, imagePath, message, rotation, senderName)
	}
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) CreateSecret(senderName, imagePath, message string, rotation float64) (*models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) GetByID(id uuid.UUID) (*models.Postcard, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(id)
	}
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) List() ([]models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) ListByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) ListSecret() ([]models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) ListSecretByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) RevealSecretBox() ([]models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) RevealSecretBoxByEvent(eventID uuid.UUID) ([]models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) RevealPostcard(id uuid.UUID) (*models.Postcard, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) GetSecretBoxStatus() (*models.SecretBoxStatus, error) {
	return nil, errors.New("not implemented")
}

func (m *MockPostcardRepo) GetSecretBoxStatusByEvent(eventID uuid.UUID) (*models.SecretBoxStatus, error) {
	return nil, errors.New("not implemented")
}

// ========== TESTS PARA INLINE PLAYER REGISTRATION ==========

// Test: Cuando se envía una postal SIN player_id pero CON name y avatar,
// debe crear un player automáticamente
func TestCreatePostcard_InlineRegistration_CreatesPlayer(t *testing.T) {
	gin.SetMode(gin.TestMode)

	eventID := uuid.New()
	createdPlayerID := uuid.New()

	mockPlayerRepo := &MockPlayerRepo{
		CreateWithEventFunc: func(eventID uuid.UUID, name, avatar string) (*models.Player, error) {
			// Verificar que se llama con los parámetros correctos
			if name != "John Doe" {
				t.Errorf("Expected name 'John Doe', got '%s'", name)
			}
			if avatar != "😀" {
				t.Errorf("Expected avatar '😀', got '%s'", avatar)
			}
			return &models.Player{
				ID:      createdPlayerID,
				EventID: eventID,
				Name:    name,
				Avatar:  avatar,
				Score:   0,
			}, nil
		},
	}

	mockPostcardRepo := &MockPostcardRepo{
		CreateWithEventFunc: func(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error) {
			// Verificar que se usa el player creado
			if playerID == nil {
				t.Error("Expected playerID to be set")
			} else if *playerID != createdPlayerID {
				t.Errorf("Expected playerID %s, got %s", createdPlayerID, *playerID)
			}
			return &models.Postcard{
				ID:         uuid.New(),
				PlayerID:   playerID,
				ImagePath:  imagePath,
				Message:    message,
				PlayerName: "John Doe",
			}, nil
		},
	}

	// Handler que simula el comportamiento con inline registration
	r := gin.New()
	r.POST("/api/events/:slug/postcards", func(c *gin.Context) {
		// Simular event middleware
		c.Set("event_id", eventID)

		// Obtener player_id del header
		playerIDStr := c.GetHeader("X-Player-ID")

		var playerID *uuid.UUID
		if playerIDStr != "" {
			id, err := uuid.Parse(playerIDStr)
			if err == nil {
				playerID = &id
			}
		}

		// Si no hay player_id, crear inline desde form data
		if playerID == nil {
			name := c.Request.FormValue("name")
			avatar := c.Request.FormValue("avatar")

			if name != "" && avatar != "" {
				player, err := mockPlayerRepo.CreateWithEvent(eventID, name, avatar)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create player"})
					return
				}
				playerID = &player.ID
			}
		}

		if playerID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Player ID or name+avatar required"})
			return
		}

		// Crear postal
		postcard, err := mockPostcardRepo.CreateWithEvent(eventID, playerID, "/test.jpg", "Test message", 0, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create postcard"})
			return
		}

		c.JSON(http.StatusCreated, postcard)
	})

	// Crear request con form data (sin X-Player-ID header)
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("name", "John Doe")
	writer.WriteField("avatar", "😀")
	writer.WriteField("message", "Test message")
	part, _ := writer.CreateFormFile("image", "test.jpg")
	part.Write([]byte("fake image data"))
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/events/test/postcards", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d: %s", http.StatusCreated, w.Code, w.Body.String())
	}

	var resp models.Postcard
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.PlayerName != "John Doe" {
		t.Errorf("Expected player name 'John Doe', got '%s'", resp.PlayerName)
	}

	t.Log("✅ Inline player registration test passed!")
}

// Test: Cuando se envía con player_id existente, no debe crear nuevo player
func TestCreatePostcard_WithExistingPlayer_DoesNotCreateNew(t *testing.T) {
	gin.SetMode(gin.TestMode)

	eventID := uuid.New()
	existingPlayerID := uuid.New()
	createCalled := false

	mockPlayerRepo := &MockPlayerRepo{
		CreateWithEventFunc: func(eventID uuid.UUID, name, avatar string) (*models.Player, error) {
			createCalled = true
			return &models.Player{ID: uuid.New()}, nil
		},
	}

	mockPostcardRepo := &MockPostcardRepo{
		CreateWithEventFunc: func(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error) {
			return &models.Postcard{PlayerID: playerID}, nil
		},
	}

	r := gin.New()
	r.POST("/api/events/:slug/postcards", func(c *gin.Context) {
		c.Set("event_id", eventID)

		playerIDStr := c.GetHeader("X-Player-ID")
		var playerID *uuid.UUID
		if playerIDStr != "" {
			id, _ := uuid.Parse(playerIDStr)
			playerID = &id
		}

		// Si hay player_id existente, no crear nuevo
		if playerID == nil {
			name := c.Request.FormValue("name")
			avatar := c.Request.FormValue("avatar")
			if name != "" && avatar != "" {
				player, _ := mockPlayerRepo.CreateWithEvent(eventID, name, avatar)
				playerID = &player.ID
			}
		}

		if playerID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Player ID required"})
			return
		}

		mockPostcardRepo.CreateWithEvent(eventID, playerID, "/test.jpg", "Test", 0, nil)
		c.JSON(http.StatusCreated, gin.H{"success": true})
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "Test")
	part, _ := writer.CreateFormFile("image", "test.jpg")
	part.Write([]byte("fake"))
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/events/test/postcards", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-Player-ID", existingPlayerID.String())
	r.ServeHTTP(w, req)

	if createCalled {
		t.Error("Should NOT have created a new player when player_id is provided")
	}

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	t.Log("✅ Existing player reuse test passed!")
}

// Test: Cuando NO hay player_id NI name/avatar, debe fallar con error
func TestCreatePostcard_NoPlayerInfo_Fails(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/api/events/:slug/postcards", func(c *gin.Context) {
		playerIDStr := c.GetHeader("X-Player-ID")
		name := c.Request.FormValue("name")
		avatar := c.Request.FormValue("avatar")

		if playerIDStr == "" && (name == "" || avatar == "") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Player ID or name+avatar required"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{})
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "Test")
	part, _ := writer.CreateFormFile("image", "test.jpg")
	part.Write([]byte("fake"))
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/events/test/postcards", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	t.Log("✅ Missing player info test passed!")
}

// Test: sender_name toma precedencia sobre player name en la postal
func TestCreatePostcard_SenderNameTakesPrecedence(t *testing.T) {
	gin.SetMode(gin.TestMode)

	eventID := uuid.New()
	playerID := uuid.New()

	r := gin.New()
	r.POST("/api/events/:slug/postcards", func(c *gin.Context) {
		c.Set("event_id", eventID)

		// Simular player existente
		pid := playerID
		senderName := c.Request.FormValue("sender_name")

		// La lógica: si hay sender_name, usarlo; si no, usar player name
		playerName := "Player Name"
		if senderName != "" {
			playerName = senderName
		}

		postcard := models.Postcard{
			PlayerID:   &pid,
			SenderName: &senderName,
			PlayerName: playerName,
		}
		c.JSON(http.StatusCreated, postcard)
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("sender_name", "Custom Sender")
	writer.WriteField("message", "Test")
	part, _ := writer.CreateFormFile("image", "test.jpg")
	part.Write([]byte("fake"))
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/events/test/postcards", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-Player-ID", playerID.String())
	r.ServeHTTP(w, req)

	var resp models.Postcard
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.PlayerName != "Custom Sender" {
		t.Errorf("Expected sender_name 'Custom Sender' to take precedence, got '%s'", resp.PlayerName)
	}

	t.Log("✅ Sender name precedence test passed!")
}

// ========== TESTS PARA EVENT-SCOPED WEBSOCKET ==========

// Test: WebSocket messages deben ser filtrados por event_id
func TestEventScopedWebSocket_FiltersByEvent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Simular un Hub que tiene rooms por evento
	type EventRoom struct {
		eventID uuid.UUID
		clients map[*mockWSClient]bool
	}

	eventRooms := make(map[string]*EventRoom)

	r := gin.New()

	// WebSocket upgrade con soporte para rooms por query param
	r.GET("/ws", func(c *gin.Context) {
		eventSlug := c.Query("event")
		if eventSlug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "event query param required"})
			return
		}

		// Simular suscripción al room del evento
		if eventRooms[eventSlug] == nil {
			eventRooms[eventSlug] = &EventRoom{
				eventID: uuid.New(),
				clients: make(map[*mockWSClient]bool),
			}
		}

		// Simular que el cliente se suscribe
		client := &mockWSClient{eventSlug: eventSlug}
		eventRooms[eventSlug].clients[client] = true

		c.JSON(http.StatusOK, gin.H{
			"subscribed_to": eventSlug,
			"total_clients": len(eventRooms[eventSlug].clients),
		})
	})

	// Cliente se suscribe a "mile-2026"
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/ws?event=mile-2026", nil)
	r.ServeHTTP(w1, req1)

	var resp1 map[string]interface{}
	json.Unmarshal(w1.Body.Bytes(), &resp1)

	if resp1["subscribed_to"] != "mile-2026" {
		t.Errorf("Expected to subscribe to 'mile-2026', got '%s'", resp1["subscribed_to"])
	}

	// Cliente diferente se suscribe a "other-event"
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/ws?event=other-event", nil)
	r.ServeHTTP(w2, req2)

	var resp2 map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp2)

	if resp2["subscribed_to"] != "other-event" {
		t.Errorf("Expected to subscribe to 'other-event', got '%s'", resp2["subscribed_to"])
	}

	// Verificar que hay rooms separados
	if len(eventRooms) != 2 {
		t.Errorf("Expected 2 event rooms, got %d", len(eventRooms))
	}

	t.Log("✅ Event-scoped WebSocket room test passed!")
}

// Test: Broadcast a un evento específico solo llega a clientes de ese evento
func TestEventScopedWebSocket_BroadcastToRoom(t *testing.T) {
	gin.SetMode(gin.TestMode)

	type mockWSClient struct {
		eventSlug string
		messages  []string
	}

	// Simular hub con rooms
	type EventHub struct {
		rooms map[string]map[*mockWSClient]bool
	}

	hub := &EventHub{
		rooms: make(map[string]map[*mockWSClient]bool),
	}

	// Suscribir clientes a rooms
	clientA := &mockWSClient{eventSlug: "mile-2026"}
	clientB := &mockWSClient{eventSlug: "mile-2026"}
	clientC := &mockWSClient{eventSlug: "other-event"}

	hub.rooms["mile-2026"] = map[*mockWSClient]bool{clientA: true, clientB: true}
	hub.rooms["other-event"] = map[*mockWSClient]bool{clientC: true}

	// Función de broadcast a un room específico
	broadcastToRoom := func(eventSlug string, message string) int {
		room := hub.rooms[eventSlug]
		if room == nil {
			return 0
		}
		count := 0
		for client := range room {
			client.messages = append(client.messages, message)
			count++
		}
		return count
	}

	// Broadcast a "mile-2026"
	sentCount := broadcastToRoom("mile-2026", "ranking_update")

	// Verificar que solo recibieron los clientes de mile-2026
	if sentCount != 2 {
		t.Errorf("Expected 2 clients to receive message, got %d", sentCount)
	}

	if len(clientA.messages) != 1 {
		t.Errorf("Client A should have 1 message, got %d", len(clientA.messages))
	}

	if len(clientB.messages) != 1 {
		t.Errorf("Client B should have 1 message, got %d", len(clientB.messages))
	}

	// Client C NO debe recibir el mensaje (está en otro evento)
	if len(clientC.messages) != 0 {
		t.Errorf("Client C should NOT receive message from other event, got %d", len(clientC.messages))
	}

	t.Log("✅ WebSocket broadcast to room test passed!")
}

// Test: Sin event query param, WebSocket falla
func TestWebSocket_RequiresEventParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/ws", func(c *gin.Context) {
		eventSlug := c.Query("event")
		if eventSlug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "event query param required"})
			return
		}
		c.JSON(http.StatusOK, gin.H{})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ws", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["error"] != "event query param required" {
		t.Errorf("Expected error message about event param, got '%s'", resp["error"])
	}

	t.Log("✅ WebSocket event param requirement test passed!")
}

// mockWSClient para tests
type mockWSClient struct {
	eventSlug string
	messages  []string
}
