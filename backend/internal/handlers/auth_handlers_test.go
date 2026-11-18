package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

// MockAuthService simula el servicio de autenticación para tests
type MockAuthService struct {
	RegisterFunc      func(email, password, name string) (*models.AuthResponse, error)
	LoginFunc         func(email, password string) (*models.AuthResponse, error)
	RefreshFunc       func(refreshToken string) (*models.AuthResponse, error)
	ValidateTokenFunc func(token string) (*models.JWTClaims, error)
}

func (m *MockAuthService) Register(email, password, name string) (*models.AuthResponse, error) {
	return m.RegisterFunc(email, password, name)
}

func (m *MockAuthService) Login(email, password string) (*models.AuthResponse, error) {
	return m.LoginFunc(email, password)
}

func (m *MockAuthService) Refresh(refreshToken string) (*models.AuthResponse, error) {
	return m.RefreshFunc(refreshToken)
}

func (m *MockAuthService) ValidateToken(token string) (*models.JWTClaims, error) {
	return m.ValidateTokenFunc(token)
}

// ========== TESTS PARA REGISTER ==========

func TestRegister(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		RegisterFunc: func(email, password, name string) (*models.AuthResponse, error) {
			return &models.AuthResponse{
				AccessToken:  "mock-access-token",
				RefreshToken: "mock-refresh-token",
				ExpiresIn:    900,
				User: models.User{
					ID:    uuid.New(),
					Email: email,
					Name:  name,
				},
			}, nil
		},
	}

	// TODO: Implementar auth handler y usar mockAuth
	r.POST("/api/auth/register", func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resp, err := mockAuth.Register(req.Email, req.Password, req.Name)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, resp)
	})

	body := models.RegisterRequest{
		Email:    "newuser@example.com",
		Password: "password123",
		Name:     "New User",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	var resp models.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.AccessToken == "" {
		t.Error("Expected access_token to be set")
	}

	if resp.RefreshToken == "" {
		t.Error("Expected refresh_token to be set")
	}

	if resp.User.Email != "newuser@example.com" {
		t.Errorf("Expected email 'newuser@example.com', got '%s'", resp.User.Email)
	}
}

func TestRegisterDuplicateEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		RegisterFunc: func(email, password, name string) (*models.AuthResponse, error) {
			return nil, repository.ErrDuplicateEmail
		},
	}

	r.POST("/api/auth/register", func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err := mockAuth.Register(req.Email, req.Password, req.Name)
		if err == repository.ErrDuplicateEmail {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{})
	})

	body := models.RegisterRequest{
		Email:    "duplicate@example.com",
		Password: "password123",
		Name:     "Duplicate User",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status %d, got %d", http.StatusConflict, w.Code)
	}
}

func TestRegisterValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.POST("/api/auth/register", func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{})
	})

	// Test con email inválido
	body := map[string]string{
		"email":    "invalid-email",
		"password": "123",
		"name":     "",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// ========== TESTS PARA LOGIN ==========

func TestLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		LoginFunc: func(email, password string) (*models.AuthResponse, error) {
			return &models.AuthResponse{
				AccessToken:  "mock-access-token",
				RefreshToken: "mock-refresh-token",
				ExpiresIn:    900,
				User: models.User{
					ID:    uuid.New(),
					Email: email,
					Name:  "Test User",
				},
			}, nil
		},
	}

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resp, err := mockAuth.Login(req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, resp)
	})

	body := models.LoginRequest{
		Email:    "user@example.com",
		Password: "password123",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var resp models.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.AccessToken == "" {
		t.Error("Expected access_token to be set")
	}
}

func TestLoginWrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		LoginFunc: func(email, password string) (*models.AuthResponse, error) {
			return nil, repository.ErrUserNotFound
		},
	}

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err := mockAuth.Login(req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		c.JSON(http.StatusOK, gin.H{})
	})

	body := models.LoginRequest{
		Email:    "user@example.com",
		Password: "wrongpassword",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLoginValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{})
	})

	// Test con email inválido
	body := map[string]string{
		"email":    "invalid-email",
		"password": "",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// ========== TESTS PARA REFRESH TOKEN ==========

func TestRefreshToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		RefreshFunc: func(refreshToken string) (*models.AuthResponse, error) {
			return &models.AuthResponse{
				AccessToken:  "new-access-token",
				RefreshToken: "new-refresh-token",
				ExpiresIn:    900,
				User: models.User{
					ID:    uuid.New(),
					Email: "user@example.com",
					Name:  "Test User",
				},
			}, nil
		},
	}

	r.POST("/api/auth/refresh", func(c *gin.Context) {
		var req models.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resp, err := mockAuth.Refresh(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, resp)
	})

	body := models.RefreshRequest{
		RefreshToken: "valid-refresh-token",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/refresh", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var resp models.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.AccessToken != "new-access-token" {
		t.Errorf("Expected new access_token, got '%s'", resp.AccessToken)
	}
}

func TestRefreshTokenInvalid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		RefreshFunc: func(refreshToken string) (*models.AuthResponse, error) {
			return nil, repository.ErrUserNotFound
		},
	}

	r.POST("/api/auth/refresh", func(c *gin.Context) {
		var req models.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err := mockAuth.Refresh(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{})
	})

	body := models.RefreshRequest{
		RefreshToken: "invalid-refresh-token",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/refresh", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

// ========== TESTS PARA AUTH MIDDLEWARE ==========

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		ValidateTokenFunc: func(token string) (*models.JWTClaims, error) {
			if token == "valid-token" {
				return &models.JWTClaims{
					UserID: uuid.New(),
					Email:  "user@example.com",
				}, nil
			}
			return nil, repository.ErrUserNotFound
		},
	}

	// Middleware de auth
	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		// Remover "Bearer " prefix
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := mockAuth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}

	r.GET("/api/me", authMiddleware, func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		email, _ := c.Get("email")
		c.JSON(http.StatusOK, gin.H{
			"user_id": userID,
			"email":   email,
		})
	})

	// Test con token válido
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/me", nil)
	req.Header.Set("Authorization", "Bearer valid-token")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestAuthMiddlewareMissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}
		c.Next()
	}

	r.GET("/api/me", authMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	// Test sin token
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/me", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthMiddlewareInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		ValidateTokenFunc: func(token string) (*models.JWTClaims, error) {
			return nil, repository.ErrUserNotFound
		},
	}

	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		_, err := mockAuth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}

	r.GET("/api/me", authMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	// Test con token inválido
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/me", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestExpiredAccessToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		ValidateTokenFunc: func(token string) (*models.JWTClaims, error) {
			// Simular token expirado
			return nil, repository.ErrUserNotFound
		},
	}

	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		_, err := mockAuth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
			c.Abort()
			return
		}

		c.Next()
	}

	r.GET("/api/protected", authMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	// Test con token expirado
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/protected", nil)
	req.Header.Set("Authorization", "Bearer expired-token")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

// ========== TEST DE INTEGRACIÓN COMPLETA ==========

func TestAuthFlowComplete(t *testing.T) {
	// Este test simula el flujo completo:
	// 1. Register → 2. Login → 3. Access protected resource → 4. Refresh token

	gin.SetMode(gin.TestMode)

	userID := uuid.New()
	accessToken := "access-token-123"
	refreshToken := "refresh-token-456"

	mockAuth := &MockAuthService{
		RegisterFunc: func(email, password, name string) (*models.AuthResponse, error) {
			return &models.AuthResponse{
				AccessToken:  accessToken,
				RefreshToken: refreshToken,
				ExpiresIn:    900,
				User: models.User{
					ID:    userID,
					Email: email,
					Name:  name,
				},
			}, nil
		},
		LoginFunc: func(email, password string) (*models.AuthResponse, error) {
			return &models.AuthResponse{
				AccessToken:  accessToken,
				RefreshToken: refreshToken,
				ExpiresIn:    900,
				User: models.User{
					ID:    userID,
					Email: "user@example.com",
					Name:  "Test User",
				},
			}, nil
		},
		ValidateTokenFunc: func(token string) (*models.JWTClaims, error) {
			if token == accessToken {
				return &models.JWTClaims{
					UserID: userID,
					Email:  "user@example.com",
				}, nil
			}
			return nil, repository.ErrUserNotFound
		},
		RefreshFunc: func(rt string) (*models.AuthResponse, error) {
			if rt == refreshToken {
				return &models.AuthResponse{
					AccessToken:  "new-access-token",
					RefreshToken: "new-refresh-token",
					ExpiresIn:    900,
					User: models.User{
						ID:    userID,
						Email: "user@example.com",
						Name:  "Test User",
					},
				}, nil
			}
			return nil, repository.ErrUserNotFound
		},
	}

	r := gin.New()

	// Register endpoint
	r.POST("/api/auth/register", func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := mockAuth.Register(req.Email, req.Password, req.Name)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, resp)
	})

	// Login endpoint
	r.POST("/api/auth/login", func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := mockAuth.Login(req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, resp)
	})

	// Protected endpoint
	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}
		claims, err := mockAuth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}
		c.Set("user_id", claims.UserID)
		c.Next()
	}

	r.GET("/api/me", authMiddleware, func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})

	// Refresh endpoint
	r.POST("/api/auth/refresh", func(c *gin.Context) {
		var req models.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := mockAuth.Refresh(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, resp)
	})

	// Step 1: Register
	registerBody := models.RegisterRequest{
		Email:    "flowtest@example.com",
		Password: "password123",
		Name:     "Flow Test",
	}
	jsonBody, _ := json.Marshal(registerBody)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Step 1 (Register) failed: expected %d, got %d", http.StatusCreated, w.Code)
	}

	// Step 2: Login
	loginBody := models.LoginRequest{
		Email:    "flowtest@example.com",
		Password: "password123",
	}
	jsonBody, _ = json.Marshal(loginBody)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Step 2 (Login) failed: expected %d, got %d", http.StatusOK, w.Code)
	}

	// Step 3: Access protected resource
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Step 3 (Protected) failed: expected %d, got %d", http.StatusOK, w.Code)
	}

	// Step 4: Refresh token
	refreshBody := models.RefreshRequest{RefreshToken: refreshToken}
	jsonBody, _ = json.Marshal(refreshBody)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/auth/refresh", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Step 4 (Refresh) failed: expected %d, got %d", http.StatusOK, w.Code)
	}

	var refreshResp models.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &refreshResp)

	if refreshResp.AccessToken != "new-access-token" {
		t.Errorf("Step 4: Expected new access token, got '%s'", refreshResp.AccessToken)
	}

	t.Log("✅ Complete auth flow test passed!")
}

// ========== TESTS PARA LOGOUT ==========

func TestLogoutSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	mockAuth := &MockAuthService{
		ValidateTokenFunc: func(token string) (*models.JWTClaims, error) {
			if token == "valid-token" {
				return &models.JWTClaims{
					UserID: uuid.New(),
					Email:  "user@example.com",
				}, nil
			}
			return nil, repository.ErrUserNotFound
		},
	}

	// Auth middleware
	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := mockAuth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}

	// Logout handler (simula el handler real)
	r.POST("/api/auth/logout", authMiddleware, func(c *gin.Context) {
		_, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
	})

	// Test con token válido
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer valid-token")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["message"] != "Successfully logged out" {
		t.Errorf("Expected message 'Successfully logged out', got '%s'", resp["message"])
	}
}

func TestLogoutUnauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Auth middleware
	authMiddleware := func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}
		c.Next()
	}

	// Logout handler
	r.POST("/api/auth/logout", authMiddleware, func(c *gin.Context) {
		_, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
	})

	// Test sin token
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/logout", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

// ========== MEDIA SESSION COOKIE ==========

// newMediaCookieAuthHandler builds a real auth handler over the disposable
// PostgreSQL used by the tests.
func newMediaCookieAuthHandler(t *testing.T) (*AuthHandler, *services.AuthService, string) {
	t.Helper()
	connString := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		testEnv("TEST_DB_HOST", "localhost"), testEnv("TEST_DB_PORT", "5432"),
		testEnv("TEST_DB_USER", "user"), testEnv("TEST_DB_PASSWORD", "password"),
		testEnv("TEST_DB_NAME", "milegame_test"))
	db, err := sql.Open("postgres", connString)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatalf("database ping error = %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo, "media-cookie-test-secret")
	email := "media-cookie-" + uuid.NewString() + "@example.test"
	if _, err := userRepo.Create(email, "password-123", "Media Cookie User"); err != nil {
		t.Fatalf("create test user error = %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM users WHERE email = $1`, email)
	})
	return NewAuthHandler(authService), authService, email
}

// mediaSessionCookie returns the media session cookie of a response.
func mediaSessionCookie(t *testing.T, response *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, cookie := range response.Result().Cookies() {
		if cookie.Name == "eventhub_media_session" {
			return cookie
		}
	}
	t.Fatalf("eventhub_media_session cookie not set, Set-Cookie headers = %v", response.Header()["Set-Cookie"])
	return nil
}

// assertMediaCookieAttributes checks the documented cookie attributes.
func assertMediaCookieAttributes(t *testing.T, cookie *http.Cookie, accessToken string, maxAge int) {
	t.Helper()
	if cookie.Value != accessToken {
		t.Errorf("cookie value = %q, want the access token", cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Error("cookie must be HttpOnly")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("cookie SameSite = %v, want Lax", cookie.SameSite)
	}
	if cookie.Path != "/uploads" {
		t.Errorf("cookie Path = %q, want /uploads", cookie.Path)
	}
	if cookie.MaxAge != maxAge {
		t.Errorf("cookie Max-Age = %d, want %d", cookie.MaxAge, maxAge)
	}
	if cookie.Domain != "" {
		t.Errorf("cookie Domain = %q, want no Domain attribute", cookie.Domain)
	}
	if cookie.Secure {
		t.Error("cookie must not be Secure over a plain request")
	}
}

func TestAuthResponsesSetMediaSessionCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, authService, email := newMediaCookieAuthHandler(t)

	router := gin.New()
	router.POST("/api/auth/register", handler.Register)
	router.POST("/api/auth/login", handler.Login)
	router.POST("/api/auth/refresh", handler.Refresh)

	post := func(path string, payload any) *httptest.ResponseRecorder {
		t.Helper()
		body, _ := json.Marshal(payload)
		request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response
	}

	// Register sets the cookie.
	registerEmail := "media-cookie-register-" + uuid.NewString() + "@example.test"
	registerResponse := post("/api/auth/register", models.RegisterRequest{
		Email: registerEmail, Password: "password-123", Name: "Media Cookie Register",
	})
	if registerResponse.Code != http.StatusCreated {
		t.Fatalf("register status = %d, want %d", registerResponse.Code, http.StatusCreated)
	}
	var registered models.AuthResponse
	if err := json.Unmarshal(registerResponse.Body.Bytes(), &registered); err != nil {
		t.Fatalf("decode register response error = %v", err)
	}
	assertMediaCookieAttributes(t, mediaSessionCookie(t, registerResponse), registered.AccessToken, registered.ExpiresIn)

	// Login sets the cookie.
	loginResponse := post("/api/auth/login", models.LoginRequest{Email: email, Password: "password-123"})
	if loginResponse.Code != http.StatusOK {
		t.Fatalf("login status = %d, want %d", loginResponse.Code, http.StatusOK)
	}
	var logged models.AuthResponse
	if err := json.Unmarshal(loginResponse.Body.Bytes(), &logged); err != nil {
		t.Fatalf("decode login response error = %v", err)
	}
	assertMediaCookieAttributes(t, mediaSessionCookie(t, loginResponse), logged.AccessToken, logged.ExpiresIn)

	// Refresh sets the cookie.
	refreshResponse := post("/api/auth/refresh", models.RefreshRequest{RefreshToken: logged.RefreshToken})
	if refreshResponse.Code != http.StatusOK {
		t.Fatalf("refresh status = %d, want %d", refreshResponse.Code, http.StatusOK)
	}
	var refreshed models.AuthResponse
	if err := json.Unmarshal(refreshResponse.Body.Bytes(), &refreshed); err != nil {
		t.Fatalf("decode refresh response error = %v", err)
	}
	assertMediaCookieAttributes(t, mediaSessionCookie(t, refreshResponse), refreshed.AccessToken, refreshed.ExpiresIn)

	// The cookie is only set for TLS requests when the request arrived over TLS.
	tlsRequest := httptest.NewRequest(http.MethodPost, "https://example.test/api/auth/login", bytes.NewReader([]byte(`{"email":"`+email+`","password":"password-123"}`)))
	tlsRequest.Header.Set("Content-Type", "application/json")
	tlsResponse := httptest.NewRecorder()
	router.ServeHTTP(tlsResponse, tlsRequest)
	secureCookie := mediaSessionCookie(t, tlsResponse)
	if !secureCookie.Secure {
		t.Error("cookie must be Secure when the request arrived over TLS")
	}

	// The API keeps the Bearer token: the auth response still carries it.
	if logged.AccessToken == "" {
		t.Error("expected access_token in the login response")
	}
	_ = authService
}

func TestLogoutClearsMediaSessionCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, _ := newMediaCookieAuthHandler(t)

	router := gin.New()
	router.POST("/api/auth/logout", func(c *gin.Context) {
		c.Set("user_id", uuid.New())
		handler.Logout(c)
	})

	request := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("logout status = %d, want %d", response.Code, http.StatusOK)
	}
	cookie := mediaSessionCookie(t, response)
	if cookie.Value != "" {
		t.Errorf("cookie value = %q, want it cleared", cookie.Value)
	}
	if cookie.MaxAge != -1 {
		t.Errorf("cookie Max-Age = %d, want -1 (deleted)", cookie.MaxAge)
	}
	if cookie.Path != "/uploads" {
		t.Errorf("cookie Path = %q, want /uploads", cookie.Path)
	}
	if !cookie.HttpOnly {
		t.Error("cookie must be HttpOnly")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("cookie SameSite = %v, want Lax", cookie.SameSite)
	}
}
