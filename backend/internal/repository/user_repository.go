package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/the-mile-game/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// UserRepository maneja las operaciones de base de datos para usuarios
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository crea un nuevo repositorio de usuarios
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create crea un nuevo usuario con password hasheado
func (r *UserRepository) Create(email, password, name string) (*models.User, error) {
	// Hashear password con bcrypt
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(passwordHash),
		Name:         name,
		CreatedAt:    time.Now(),
	}

	query := `
		INSERT INTO users (id, email, password_hash, name, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err = r.db.Exec(query, user.ID, user.Email, user.PasswordHash, user.Name, user.CreatedAt)
	if err != nil {
		// Verificar si es error de duplicado
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrDuplicateEmail
		}
		return nil, err
	}

	return user, nil
}

// GetByEmail obtiene un usuario por su email
func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, name, created_at
		FROM users
		WHERE email = $1
	`

	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// GetByID obtiene un usuario por su ID
func (r *UserRepository) GetByID(id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, name, created_at
		FROM users
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// VerifyPassword verifica si el password coincide con el hash
func (r *UserRepository) VerifyPassword(user *models.User, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	return err == nil
}

// ErrDuplicateEmail error cuando el email ya existe
var ErrDuplicateEmail = sql.ErrNoRows

// ErrUserNotFound error cuando el usuario no existe
var ErrUserNotFound = sql.ErrNoRows
