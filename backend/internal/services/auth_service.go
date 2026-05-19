package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// AuthService maneja la lógica de autenticación
type AuthService struct {
	userRepo        *repository.UserRepository
	resetTokenRepo  *repository.ResetTokenRepository
	emailSender     EmailSender
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
	resetTokenTTL   time.Duration // e.g., 15 minutes
	baseURL         string        // URL base de la app para links en emails
}

// NewAuthService crea un nuevo servicio de autenticación
func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		jwtSecret:       []byte(jwtSecret),
		accessTokenTTL:  15 * time.Minute,   // 15 minutos
		refreshTokenTTL: 7 * 24 * time.Hour, // 7 días
		resetTokenTTL:   1 * time.Hour,      // 1 hora
	}
}

// NewAuthServiceWithReset crea un nuevo AuthService con soporte para reset de password
func NewAuthServiceWithReset(userRepo *repository.UserRepository, resetTokenRepo *repository.ResetTokenRepository, emailSender EmailSender, jwtSecret, baseURL string) *AuthService {
	svc := NewAuthService(userRepo, jwtSecret)
	svc.resetTokenRepo = resetTokenRepo
	svc.emailSender = emailSender
	svc.baseURL = baseURL
	return svc
}

// customClaims estructura de claims JWT personalizada
type customClaims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

// Register crea un nuevo usuario y retorna tokens
func (s *AuthService) Register(email, password, name string) (*models.AuthResponse, error) {
	// Crear usuario
	user, err := s.userRepo.Create(email, password, name)
	if err != nil {
		if err == repository.ErrDuplicateEmail {
			return nil, ErrDuplicateEmail
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generar tokens
	return s.generateTokenResponse(user)
}

// Login valida credenciales y retorna tokens
func (s *AuthService) Login(email, password string) (*models.AuthResponse, error) {
	// Buscar usuario
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Verificar password
	if !s.userRepo.VerifyPassword(user, password) {
		return nil, ErrInvalidCredentials
	}

	// Generar tokens
	return s.generateTokenResponse(user)
}

// Refresh genera nuevos tokens a partir de un refresh token válido
func (s *AuthService) Refresh(refreshToken string) (*models.AuthResponse, error) {
	// Validar refresh token
	claims, err := s.validateRefreshToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}

	// Buscar usuario
	user, err := s.userRepo.GetByID(claims.UserID)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}

	// Generar nuevos tokens
	return s.generateTokenResponse(user)
}

// ValidateToken valida un access token y retorna los claims
func (s *AuthService) ValidateToken(tokenString string) (*models.JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &customClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	if claims, ok := token.Claims.(*customClaims); ok && token.Valid {
		return &models.JWTClaims{
			UserID: claims.UserID,
			Email:  claims.Email,
		}, nil
	}

	return nil, ErrInvalidToken
}

// generateTokenResponse genera access y refresh tokens para un usuario
func (s *AuthService) generateTokenResponse(user *models.User) (*models.AuthResponse, error) {
	// Generar access token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generar refresh token
	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(s.accessTokenTTL.Seconds()),
		User:         *user,
	}, nil
}

// generateAccessToken genera un JWT access token
func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	now := time.Now()
	claims := customClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// generateRefreshToken genera un refresh token (JWT simple)
func (s *AuthService) generateRefreshToken(user *models.User) (string, error) {
	now := time.Now()
	claims := customClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Subject:   user.ID.String(),
			ID:        uuid.New().String(), // JTI para revocación si se implementa
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// validateRefreshToken valida un refresh token
func (s *AuthService) validateRefreshToken(tokenString string) (*models.JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &customClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*customClaims); ok && token.Valid {
		return &models.JWTClaims{
			UserID: claims.UserID,
			Email:  claims.Email,
		}, nil
	}

	return nil, errors.New("invalid token")
}

// RequestPasswordReset genera un token de reset y lo envía por email
// Retorna el token en bruto (paradevelopment/debug) y error
func (s *AuthService) RequestPasswordReset(email string) (string, error) {
	// Buscar usuario por email (si no existe, no retornar error - seguridad)
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		// No revelar si el email existe o no
		if err == repository.ErrUserNotFound {
			return "", nil
		}
		return "", err
	}

	// Verificar que el servicio tiene repositorio de reset y email sender
	if s.resetTokenRepo == nil || s.emailSender == nil {
		return "", ErrPasswordResetNotConfigured
	}

	// Limpiar tokens expirados o usados previamente
	_ = s.resetTokenRepo.DeleteExpiredByUserID(user.ID)

	// Generar token (32 bytes aleatorios, URL-safe base64)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	rawToken := base64.URLEncoding.EncodeToString(tokenBytes)

	// Hashear para almacenamiento (SHA256 hex)
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := fmt.Sprintf("%x", hash)

	// Crear registro en base de datos
	resetToken := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(s.resetTokenTTL),
		Used:      false,
		CreatedAt: time.Now(),
	}
	if err := s.resetTokenRepo.Create(resetToken); err != nil {
		return "", fmt.Errorf("failed to store reset token: %w", err)
	}

	// Construir URL completo de reset
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.baseURL, rawToken)
	if err := s.emailSender.SendPasswordReset(email, resetURL); err != nil {
		return "", fmt.Errorf("failed to send reset email: %w", err)
	}

	return rawToken, nil
}

// ResetPassword valida el token y actualiza el password del usuario
func (s *AuthService) ResetPassword(rawToken, newPassword string) error {
	if s.resetTokenRepo == nil {
		return ErrPasswordResetNotConfigured
	}

	// Hashear el token para buscarlo
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := fmt.Sprintf("%x", hash)

	// Buscar token
	token, err := s.resetTokenRepo.FindByTokenHash(tokenHash)
	if err != nil {
		if err == repository.ErrResetTokenNotFound {
			return ErrInvalidResetToken
		}
		return err
	}

	// Verificar que no fue usado
	if token.Used {
		return ErrInvalidResetToken
	}

	// Verificar que no expiró
	if time.Now().After(token.ExpiresAt) {
		return ErrInvalidResetToken
	}

	// Obtener usuario
	user, err := s.userRepo.GetByID(token.UserID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Hashear nuevo password con bcrypt
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Actualizar password en base de datos (directo en userRepo)
	if err := s.userRepo.UpdatePassword(user.ID, string(passwordHash)); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Marcar token como usado
	if err := s.resetTokenRepo.MarkUsed(token.ID); err != nil {
		// No fallar si no se puede marcar - el password ya fue cambiado
		// El token expirará eventualmente
	}

	return nil
}

// HashPassword hashea un password usando bcrypt (útil para scripts de admin)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// Errores del servicio de auth
var (
	ErrDuplicateEmail             = errors.New("email already exists")
	ErrInvalidCredentials         = errors.New("invalid credentials")
	ErrInvalidToken               = errors.New("invalid or expired token")
	ErrInvalidRefreshToken        = errors.New("invalid refresh token")
	ErrPasswordResetNotConfigured = errors.New("password reset not configured")
	ErrInvalidResetToken          = errors.New("invalid or expired reset token")
)
