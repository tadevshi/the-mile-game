package repository

import (
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// cleanupResetTokenTestData cleans up reset token test data
func cleanupResetTokenTestData(t *testing.T, db *sql.DB) {
	tables := []string{
		"password_reset_tokens",
		"users",
	}
	for _, table := range tables {
		if _, err := db.Exec("DELETE FROM " + table); err != nil {
			t.Logf("Warning: failed to cleanup table %s: %v", table, err)
		}
	}
}

// createTestUserForResetToken creates a test user for reset token tests
func createTestUserForResetToken(t *testing.T, db *sql.DB) *models.User {
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("testpassword123"), bcrypt.DefaultCost)

	user := &models.User{
		ID:           uuid.New(),
		Email:        "test_" + uuid.New().String()[:8] + "@example.com",
		PasswordHash: string(passwordHash),
		Name:         "Test User",
		CreatedAt:    time.Now(),
	}

	query := `INSERT INTO users (id, email, password_hash, name, created_at) VALUES ($1, $2, $3, $4, $5)`
	_, err := db.Exec(query, user.ID, user.Email, user.PasswordHash, user.Name, user.CreatedAt)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return user
}

// ========== TESTS FOR ResetTokenRepository ==========

func TestCreateResetToken(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupResetTokenTestData(t, db)

	user := createTestUserForResetToken(t, db)
	repo := NewResetTokenRepository(db)

	token := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: "test-token-hash-abc123",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
		CreatedAt: time.Now(),
	}

	err := repo.Create(token)
	if err != nil {
		t.Fatalf("Expected no error on create, got: %v", err)
	}

	// Verify insert
	stored, err := repo.FindByTokenHash(token.TokenHash)
	if err != nil {
		t.Fatalf("Expected no error on find, got: %v", err)
	}
	if stored.ID != token.ID {
		t.Errorf("Expected ID %v, got %v", token.ID, stored.ID)
	}
	if stored.UserID != user.ID {
		t.Errorf("Expected UserID %v, got %v", user.ID, stored.UserID)
	}
	if stored.Used != false {
		t.Errorf("Expected Used false, got %v", stored.Used)
	}
}

func TestFindByTokenHash_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupResetTokenTestData(t, db)

	repo := NewResetTokenRepository(db)

	_, err := repo.FindByTokenHash("nonexistent-token-hash")
	if err == nil {
		t.Error("Expected error for non-existent token, got nil")
	}
	if err != ErrResetTokenNotFound {
		t.Errorf("Expected ErrResetTokenNotFound, got %v", err)
	}
}

func TestMarkUsed(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupResetTokenTestData(t, db)

	user := createTestUserForResetToken(t, db)
	repo := NewResetTokenRepository(db)

	token := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: "test-token-hash-mark-used",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
		CreatedAt: time.Now(),
	}

	err := repo.Create(token)
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// Mark as used
	err = repo.MarkUsed(token.ID)
	if err != nil {
		t.Fatalf("Expected no error on mark used, got: %v", err)
	}

	// Verify token is marked as used
	stored, err := repo.FindByTokenHash(token.TokenHash)
	if err != nil {
		t.Fatalf("Expected no error on find, got: %v", err)
	}
	if stored.Used != true {
		t.Errorf("Expected Used true, got %v", stored.Used)
	}
}

func TestMarkUsed_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupResetTokenTestData(t, db)

	repo := NewResetTokenRepository(db)

	err := repo.MarkUsed(uuid.New())
	if err == nil {
		t.Error("Expected error for non-existent token, got nil")
	}
}

func TestDeleteExpiredByUserID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupResetTokenTestData(t, db)

	user := createTestUserForResetToken(t, db)
	repo := NewResetTokenRepository(db)

	// Create an expired token
	expiredToken := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: "expired-token-hash",
		ExpiresAt: time.Now().Add(-1 * time.Hour), // expired
		Used:      false,
		CreatedAt: time.Now().Add(-2 * time.Hour),
	}
	repo.Create(expiredToken)

	// Create a valid token
	validToken := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: "valid-token-hash",
		ExpiresAt: time.Now().Add(1 * time.Hour), // valid
		Used:      false,
		CreatedAt: time.Now(),
	}
	repo.Create(validToken)

	// Create a used token (also should be deleted)
	usedToken := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: "used-token-hash",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      true,
		CreatedAt: time.Now(),
	}
	repo.Create(usedToken)

	// Delete expired/used
	err := repo.DeleteExpiredByUserID(user.ID)
	if err != nil {
		t.Fatalf("Expected no error on delete, got: %v", err)
	}

	// Valid token should still exist
	_, err = repo.FindByTokenHash(validToken.TokenHash)
	if err != nil {
		t.Errorf("Valid token should still exist, got error: %v", err)
	}

	// Expired token should be deleted
	_, err = repo.FindByTokenHash(expiredToken.TokenHash)
	if err != ErrResetTokenNotFound {
		t.Errorf("Expired token should be deleted, got: %v", err)
	}

	// Used token should be deleted
	_, err = repo.FindByTokenHash(usedToken.TokenHash)
	if err != ErrResetTokenNotFound {
		t.Errorf("Used token should be deleted, got: %v", err)
	}
}

func TestResetTokenFlow(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupResetTokenTestData(t, db)

	user := createTestUserForResetToken(t, db)
	repo := NewResetTokenRepository(db)

	// Simulate full flow: create -> find -> mark used -> find again
	token := &models.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: "flow-test-token-hash",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
		CreatedAt: time.Now(),
	}

	err := repo.Create(token)
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// Find should work
	found, err := repo.FindByTokenHash(token.TokenHash)
	if err != nil {
		t.Fatalf("Failed to find token: %v", err)
	}
	if found.ID != token.ID {
		t.Errorf("Expected ID %v, got %v", token.ID, found.ID)
	}

	// Mark as used
	err = repo.MarkUsed(token.ID)
	if err != nil {
		t.Fatalf("Failed to mark used: %v", err)
	}

	// Find again - should still exist but be marked used
	found, err = repo.FindByTokenHash(token.TokenHash)
	if err != nil {
		t.Fatalf("Failed to find used token: %v", err)
	}
	if found.Used != true {
		t.Errorf("Expected Used true after mark, got %v", found.Used)
	}
}