package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// ResetTokenRepository maneja las operaciones de base de datos para tokens de reset de password
type ResetTokenRepository struct {
	db *sql.DB
}

// NewResetTokenRepository crea un nuevo repositorio de tokens de reset
func NewResetTokenRepository(db *sql.DB) *ResetTokenRepository {
	return &ResetTokenRepository{db: db}
}

// Create crea un nuevo token de reset de password
func (r *ResetTokenRepository) Create(token *models.PasswordResetToken) error {
	query := `
		INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query, token.ID, token.UserID, token.TokenHash, token.ExpiresAt, token.Used, token.CreatedAt)
	return err
}

// FindByTokenHash busca un token de reset por su hash
func (r *ResetTokenRepository) FindByTokenHash(tokenHash string) (*models.PasswordResetToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, used, created_at
		FROM password_reset_tokens
		WHERE token_hash = $1
	`
	token := &models.PasswordResetToken{}
	err := r.db.QueryRow(query, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.Used, &token.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrResetTokenNotFound
		}
		return nil, err
	}
	return token, nil
}

// MarkUsed marca un token de reset como usado
func (r *ResetTokenRepository) MarkUsed(id uuid.UUID) error {
	query := `
		UPDATE password_reset_tokens
		SET used = TRUE
		WHERE id = $1
	`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("token not found")
	}
	return nil
}

// DeleteExpiredByUserID elimina tokens expirados de un usuario (limpieza)
func (r *ResetTokenRepository) DeleteExpiredByUserID(userID uuid.UUID) error {
	query := `
		DELETE FROM password_reset_tokens
		WHERE user_id = $1 AND (used = TRUE OR expires_at < $2)
	`
	_, err := r.db.Exec(query, userID, time.Now())
	return err
}

// ErrResetTokenNotFound error cuando el token no existe
var ErrResetTokenNotFound = errors.New("reset token not found")