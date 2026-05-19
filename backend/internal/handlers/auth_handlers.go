package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/services"
)

// AuthHandler maneja las peticiones de autenticación
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler crea un nuevo handler de autenticación
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register registra un nuevo usuario
// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Register(req.Email, req.Password, req.Name)
	if err != nil {
		if err == services.ErrDuplicateEmail {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// Login autentica un usuario existente
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		if err == services.ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to login"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Refresh genera nuevos tokens a partir de un refresh token
// POST /api/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Refresh(req.RefreshToken)
	if err != nil {
		if err == services.ErrInvalidRefreshToken {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh token"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Me retorna la información del usuario autenticado
// GET /api/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	// Obtener user_id del contexto (seteado por AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	email, _ := c.Get("email")

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"email":   email,
	})
}

// Logout cierra la sesión del usuario autenticado
// POST /api/auth/logout
// Nota: Dado que usamos JWT stateless sin blacklist, este endpoint
// hace logout del lado del cliente. El servidor simplemente confirma.
func (h *AuthHandler) Logout(c *gin.Context) {
	// Verificar que el usuario está autenticado (middleware ya validó el token)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Logout stateless: el cliente debe eliminar los tokens
	// El servidor solo confirma el logout
	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
}

// ForgotPassword solicita un email de recuperación de password
// POST /api/auth/forgot-password
// Siempre retorna 200 por seguridad (no revelar si el email existe)
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// El servicio maneja la lógica de buscar usuario y enviar email
	// Si el email no existe, retorna nil error (seguridad)
	_, err := h.authService.RequestPasswordReset(req.Email)
	if err != nil {
		// Loguear error pero no revelar al cliente
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "If that email exists, a reset link has been sent"})
}

// ResetPassword resetea el password usando un token válido
// POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.ResetPassword(req.Token, req.Password)
	if err != nil {
		if err == services.ErrInvalidResetToken {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password successfully reset"})
}
