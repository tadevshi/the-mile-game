package services

import (
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
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

// NewAuthService crea un nuevo servicio de autenticación
func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		jwtSecret:       []byte(jwtSecret),
		accessTokenTTL:  15 * time.Minute,   // 15 minutos
		refreshTokenTTL: 7 * 24 * time.Hour, // 7 días
	}
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

// HashPassword hashea un password usando bcrypt (útil para scripts de admin)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// Errores del servicio de auth
var (
	ErrDuplicateEmail      = errors.New("email already exists")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrInvalidToken        = errors.New("invalid or expired token")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
)
