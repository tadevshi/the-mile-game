package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

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

func TestCreateSecretPostcardMissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setear el token esperado en el entorno
	os.Setenv("SECRET_BOX_TOKEN", "test-secret-token")
	defer os.Unsetenv("SECRET_BOX_TOKEN")

	r := gin.New()
	r.POST("/api/postcards/secret", func(c *gin.Context) {
		token := c.GetHeader("X-Secret-Token")
		expected := os.Getenv("SECRET_BOX_TOKEN")
		if expected == "" || token != expected {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing secret token"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"id": uuid.New().String()})
	})

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{"no token", "", http.StatusUnauthorized},
		{"wrong token", "wrong-token", http.StatusUnauthorized},
		{"correct token", "test-secret-token", http.StatusCreated},
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

func TestAdminHandlersMissingKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	os.Setenv("ADMIN_PASSPHRASE", "test-admin-key")
	defer os.Unsetenv("ADMIN_PASSPHRASE")

	r := gin.New()

	// Simular el helper validateAdminKey inline
	adminMiddleware := func(c *gin.Context) {
		key := c.GetHeader("X-Admin-Key")
		expected := os.Getenv("ADMIN_PASSPHRASE")
		if expected == "" || key != expected {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing admin key"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/api/admin/status", adminMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"total": 0, "revealed": false})
	})
	r.GET("/api/admin/secret-box", adminMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, []interface{}{})
	})
	r.POST("/api/admin/reveal", adminMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Secret Box revealed"})
	})

	routes := []struct {
		method string
		path   string
	}{
		{"GET", "/api/admin/status"},
		{"GET", "/api/admin/secret-box"},
		{"POST", "/api/admin/reveal"},
	}

	for _, route := range routes {
		t.Run(route.method+" "+route.path+" no key", func(t *testing.T) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest(route.method, route.path, nil)
			r.ServeHTTP(w, req)
			if w.Code != http.StatusUnauthorized {
				t.Errorf("Expected 401 without admin key, got %d", w.Code)
			}
		})

		t.Run(route.method+" "+route.path+" wrong key", func(t *testing.T) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest(route.method, route.path, nil)
			req.Header.Set("X-Admin-Key", "wrong-key")
			r.ServeHTTP(w, req)
			if w.Code != http.StatusUnauthorized {
				t.Errorf("Expected 401 with wrong admin key, got %d", w.Code)
			}
		})

		t.Run(route.method+" "+route.path+" correct key", func(t *testing.T) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest(route.method, route.path, bytes.NewBuffer([]byte{}))
			req.Header.Set("X-Admin-Key", "test-admin-key")
			r.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				t.Errorf("Expected 200 with correct admin key, got %d", w.Code)
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
