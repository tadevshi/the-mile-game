package worker

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

// MockDriveService is a mock implementation of DriveService for testing
type MockDriveService struct {
	UploadFileFunc          func(ctx context.Context, accessToken string, content []byte, mimeType, idempotencyKey string) (*services.UploadResult, error)
	UploadFileMultipartFunc func(ctx context.Context, accessToken string, fileContent []byte, filename, mimeType, idempotencyKey string, parentID *string) (*services.UploadResult, error)
	EnsureFolderFunc        func(ctx context.Context, accessToken, folderName string, parentID *string) (string, error)
	RefreshTokenFunc        func(ctx context.Context, refreshToken string) (*services.TokenResponse, error)
	DecryptTokenFunc        func(ciphertext string) (string, error)
	IsTokenExpiredFunc      func(expiry time.Time) bool
}

func (m *MockDriveService) UploadFile(ctx context.Context, accessToken string, content []byte, mimeType, idempotencyKey string) (*services.UploadResult, error) {
	if m.UploadFileFunc != nil {
		return m.UploadFileFunc(ctx, accessToken, content, mimeType, idempotencyKey)
	}
	return &services.UploadResult{DriveFileID: "mock-file-id", Name: "mock.jpg"}, nil
}

func (m *MockDriveService) UploadFileMultipart(ctx context.Context, accessToken string, fileContent []byte, filename, mimeType, idempotencyKey string, parentID *string) (*services.UploadResult, error) {
	if m.UploadFileMultipartFunc != nil {
		return m.UploadFileMultipartFunc(ctx, accessToken, fileContent, filename, mimeType, idempotencyKey, parentID)
	}
	return &services.UploadResult{DriveFileID: "mock-file-id", Name: filename, MimeType: mimeType}, nil
}

func (m *MockDriveService) EnsureFolder(ctx context.Context, accessToken, folderName string, parentID *string) (string, error) {
	if m.EnsureFolderFunc != nil {
		return m.EnsureFolderFunc(ctx, accessToken, folderName, parentID)
	}
	if folderName == "EventHub Backups" {
		return "base-folder-id", nil
	}
	return "event-folder-id", nil
}

func (m *MockDriveService) RefreshToken(ctx context.Context, refreshToken string) (*services.TokenResponse, error) {
	if m.RefreshTokenFunc != nil {
		return m.RefreshTokenFunc(ctx, refreshToken)
	}
	return &services.TokenResponse{AccessToken: "new-access-token", ExpiresIn: 3600, Expiry: time.Now().Add(time.Hour)}, nil
}

func (m *MockDriveService) DecryptToken(ciphertext string) (string, error) {
	if m.DecryptTokenFunc != nil {
		return m.DecryptTokenFunc(ciphertext)
	}
	return "decrypted-token", nil
}

func (m *MockDriveService) IsTokenExpired(expiry time.Time) bool {
	if m.IsTokenExpiredFunc != nil {
		return m.IsTokenExpiredFunc(expiry)
	}
	return time.Now().After(expiry)
}

// setupTestDB creates a test database connection
func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("postgres", "host=localhost port=5432 user=user password=password dbname=milegame_test sslmode=disable")
	if err != nil {
		t.Skipf("Skipping: cannot connect to test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("Skipping: cannot ping test database: %v", err)
	}
	return db
}

// createTestUser creates a test user for worker tests
func createTestUserForWorker(t *testing.T, db *sql.DB) *models.User {
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

// createTestEventWithDrive creates a test event with corkboard feature
func createTestEventWithDrive(t *testing.T, db *sql.DB, ownerID uuid.UUID) *models.Event {
	eventID := uuid.New()
	slug := "test-event-" + uuid.New().String()[:8]

	query := `
		INSERT INTO events (id, owner_id, slug, name, description, features, created_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true)
	`
	featuresJSON := `{"corkboard":true,"quiz":false}`
	_, err := db.Exec(query, eventID, ownerID, slug, "Test Event", "Test Description", featuresJSON, time.Now())
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	return &models.Event{
		ID:      eventID,
		OwnerID: ownerID,
		Slug:    slug,
		Name:    "Test Event",
	}
}

// createTestPlayer creates a test player for an event
func createTestPlayer(t *testing.T, db *sql.DB, eventID uuid.UUID) *models.Player {
	player := &models.Player{
		ID:        uuid.New(),
		EventID:   eventID,
		Name:      "Test Player " + uuid.New().String()[:4],
		Avatar:    "👤",
		Score:     0,
		CreatedAt: time.Now(),
	}

	query := `INSERT INTO players (id, event_id, name, avatar, score, created_at) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := db.Exec(query, player.ID, player.EventID, player.Name, player.Avatar, player.Score, player.CreatedAt)
	if err != nil {
		t.Fatalf("Failed to create test player: %v", err)
	}

	return player
}

// createTestPostcard creates a test postcard for an event
// It also creates the actual media file at the path if uploadsDir is set
func createTestPostcard(t *testing.T, db *sql.DB, eventID uuid.UUID, playerID *uuid.UUID, uploadsDir string) *models.Postcard {
	filename := "test-" + uuid.New().String()[:8] + ".jpg"
	postcard := &models.Postcard{
		ID:        uuid.New(),
		EventID:   eventID,
		PlayerID:  playerID,
		ImagePath: filename, // Relative path - will be joined with uploadsDir
		Message:   "Test message",
		Rotation:  0,
		IsSecret:  false,
		CreatedAt: time.Now(),
		MediaType: "image",
	}

	query := `
		INSERT INTO postcards (id, event_id, player_id, image_path, message, rotation, is_secret, created_at, media_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := db.Exec(query, postcard.ID, postcard.EventID, postcard.PlayerID, postcard.ImagePath, postcard.Message, postcard.Rotation, postcard.IsSecret, postcard.CreatedAt, postcard.MediaType)
	if err != nil {
		t.Fatalf("Failed to create test postcard: %v", err)
	}

	// Create the actual media file if uploadsDir is provided
	if uploadsDir != "" {
		fullPath := filepath.Join(uploadsDir, filename)
		if err := os.WriteFile(fullPath, []byte("fake image content for testing"), 0644); err != nil {
			t.Fatalf("Failed to create test media file: %v", err)
		}
	}

	return postcard
}

// createTestDriveConnection creates a drive connection for a user
func createTestDriveConnection(t *testing.T, db *sql.DB, userID uuid.UUID, accessToken, refreshToken string) {
	query := `
		INSERT INTO drive_connections (id, user_id, drive_refresh_token_encrypted, drive_access_token, token_expiry, connected_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO UPDATE SET
			drive_refresh_token_encrypted = EXCLUDED.drive_refresh_token_encrypted,
			drive_access_token = EXCLUDED.drive_access_token,
			token_expiry = EXCLUDED.token_expiry,
			connected_at = EXCLUDED.connected_at,
			disconnected_at = NULL
	`
	_, err := db.Exec(query, uuid.New(), userID, refreshToken, accessToken, time.Now().Add(time.Hour), time.Now())
	if err != nil {
		t.Fatalf("Failed to create drive connection: %v", err)
	}
}

// setupTestWorker creates a worker with mocks for testing
// It also creates a temp uploads directory and sets UPLOADS_DIR env var
func setupTestWorker(t *testing.T) (*BackupWorker, *repository.DriveRepository, *MockDriveService, *sql.DB, string) {
	// Note: This requires a test database connection
	// Skip if DB is not available
	db, err := sql.Open("postgres", "host=localhost port=5432 user=user password=password dbname=milegame_test sslmode=disable")
	if err != nil {
		t.Skipf("Skipping: cannot connect to test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("Skipping: cannot ping test database: %v", err)
	}

	// Create temp uploads directory
	tmpDir, err := os.MkdirTemp("", "test-uploads-*")
	if err != nil {
		t.Fatalf("Failed to create temp uploads dir: %v", err)
	}
	// Set UPLOADS_DIR so readMediaFile uses this directory
	if err := os.Setenv("UPLOADS_DIR", tmpDir); err != nil {
		t.Fatalf("Failed to set UPLOADS_DIR: %v", err)
	}

	// Set encryption key
	testKey := "12345678901234567890123456789012"
	if err := services.SetDriveEncryptionKey(testKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	driveRepo := repository.NewDriveRepository(db)
	mockDrive := &MockDriveService{}

	cfg := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		EncryptionKey: testKey,
	}

	worker := NewBackupWorker(cfg, driveRepo, mockDrive, 2) // pool size 2

	return worker, driveRepo, mockDrive, db, tmpDir
}

// ========== Tests for BackupWorker initialization ==========

func TestNewBackupWorker(t *testing.T) {
	cfg := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		EncryptionKey: "12345678901234567890123456789012",
	}

	if err := services.SetDriveEncryptionKey(cfg.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	// Create a minimal worker without DB for initialization testing
	worker := NewBackupWorker(cfg, nil, nil, 2)

	if worker == nil {
		t.Fatal("Expected non-nil BackupWorker")
	}
	if worker.Config != cfg {
		t.Error("Expected config to be set")
	}
	if worker.poolSize != 2 {
		t.Errorf("Expected pool size 2, got %d", worker.poolSize)
	}
}

// ========== Tests for job enqueueing ==========

func TestBackupWorker_EnqueueBackupJob(t *testing.T) {
	worker, _, _, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return // Skip test
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up the full data chain: user -> event -> player -> postcard
	// Pass empty uploadsDir since this test doesn't process jobs (just enqueues)
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, "")

	// Enqueue a job for the real postcard
	idempotencyKey := "test-key-123"

	jobID, err := worker.EnqueueBackupJob(postcard.ID, idempotencyKey)

	if err != nil {
		t.Errorf("Expected no error on enqueue, got: %v", err)
	}
	if jobID == uuid.Nil {
		t.Error("Expected non-nil job ID")
	}

	// Verify job was created in DB
	job, err := worker.repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Expected job to be created, got error: %v", err)
	}
	if job.IdempotencyKey != idempotencyKey {
		t.Errorf("Expected idempotency key %s, got %s", idempotencyKey, job.IdempotencyKey)
	}
	if job.Status != models.BackupJobStatusQueued {
		t.Errorf("Expected status 'queued', got %s", job.Status)
	}
}

func TestBackupWorker_EnqueueBackupJob_Idempotent(t *testing.T) {
	worker, _, _, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up the full data chain (pass empty uploadsDir - enqueue only)
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, "")

	idempotencyKey := "same-key"

	// First enqueue
	_, err := worker.EnqueueBackupJob(postcard.ID, idempotencyKey)
	if err != nil {
		t.Fatalf("First enqueue failed: %v", err)
	}

	// Second enqueue with same idempotency key should fail
	_, err = worker.EnqueueBackupJob(postcard.ID, idempotencyKey)
	if err == nil {
		t.Error("Expected error for duplicate idempotency key, got nil")
	}
}

// ========== Tests for worker processing ==========

func TestBackupWorker_ProcessJob_Success(t *testing.T) {
	worker, _, mockDrive, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up proper test data chain (pass uploadsDir to create media files)
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, uploadsDir)

	// Encrypt tokens for drive connection
	encryptedAccess, _ := services.EncryptToken("test-access-token")
	encryptedRefresh, _ := services.EncryptToken("test-refresh-token")
	createTestDriveConnection(t, db, user.ID, encryptedAccess, encryptedRefresh)

	idempotencyKey := "process-success-key"

	// Create job directly in DB
	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	if err := worker.repo.CreateBackupJob(job); err != nil {
		t.Fatalf("Failed to create job: %v", err)
	}

	// Track upload calls
	var uploadCalled int32
	mockDrive.UploadFileFunc = func(ctx context.Context, accessToken string, content []byte, mimeType, key string) (*services.UploadResult, error) {
		atomic.AddInt32(&uploadCalled, 1)
		return &services.UploadResult{
			DriveFileID: "uploaded-file-id",
			Name:        "test.jpg",
			MimeType:    mimeType,
		}, nil
	}

	// Process the job
	err := worker.processJob(job)
	if err != nil {
		t.Errorf("Expected no error on process, got: %v", err)
	}

	// Verify upload was called
	if atomic.LoadInt32(&uploadCalled) != 1 {
		t.Errorf("Expected upload called 1 time, got %d", uploadCalled)
	}

	// Verify job status was updated
	updatedJob, err := worker.repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Failed to get updated job: %v", err)
	}
	if updatedJob.Status != models.BackupJobStatusSynced {
		t.Errorf("Expected status 'synced', got %s", updatedJob.Status)
	}
	if updatedJob.DriveFileID == nil || *updatedJob.DriveFileID != "uploaded-file-id" {
		t.Error("Expected drive_file_id to be set")
	}
	// Verify synced_at is set for successful job
	if updatedJob.SyncedAt == nil {
		t.Error("Expected synced_at to be set for successful job")
	}
}

func TestBackupWorker_ProcessJob_RetryOnFailure(t *testing.T) {
	worker, _, mockDrive, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up proper test data chain
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, uploadsDir)

	encryptedAccess, _ := services.EncryptToken("test-access-token")
	encryptedRefresh, _ := services.EncryptToken("test-refresh-token")
	createTestDriveConnection(t, db, user.ID, encryptedAccess, encryptedRefresh)

	idempotencyKey := "retry-test-key"

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	if err := worker.repo.CreateBackupJob(job); err != nil {
		t.Fatalf("Failed to create job: %v", err)
	}

	// Make upload fail twice, then succeed
	var callCount int32
	mockDrive.UploadFileFunc = func(ctx context.Context, accessToken string, content []byte, mimeType, key string) (*services.UploadResult, error) {
		count := atomic.AddInt32(&callCount, 1)
		if count < 3 {
			return nil, errors.New("transient network error")
		}
		return &services.UploadResult{DriveFileID: "uploaded-on-retry", Name: "test.jpg"}, nil
	}

	// Process should retry and eventually succeed
	err := worker.processJob(job)
	if err != nil {
		t.Errorf("Expected eventual success after retries, got: %v", err)
	}

	// Should have been called 3 times
	if atomic.LoadInt32(&callCount) != 3 {
		t.Errorf("Expected 3 upload attempts, got %d", callCount)
	}

	// Verify job status
	updatedJob, err := worker.repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Failed to get updated job: %v", err)
	}
	if updatedJob.Status != models.BackupJobStatusSynced {
		t.Errorf("Expected status 'synced', got %s", updatedJob.Status)
	}
	if updatedJob.RetryCount != 2 {
		t.Errorf("Expected retry_count 2, got %d", updatedJob.RetryCount)
	}
}

func TestBackupWorker_ProcessJob_MaxRetriesExceeded(t *testing.T) {
	worker, _, mockDrive, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up proper test data chain
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, uploadsDir)

	encryptedAccess, _ := services.EncryptToken("test-access-token")
	encryptedRefresh, _ := services.EncryptToken("test-refresh-token")
	createTestDriveConnection(t, db, user.ID, encryptedAccess, encryptedRefresh)

	idempotencyKey := "max-retry-key"

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	if err := worker.repo.CreateBackupJob(job); err != nil {
		t.Fatalf("Failed to create job: %v", err)
	}

	// Make upload always fail
	mockDrive.UploadFileFunc = func(ctx context.Context, accessToken string, content []byte, mimeType, key string) (*services.UploadResult, error) {
		return nil, errors.New("persistent error")
	}

	// Process should fail after max retries
	err := worker.processJob(job)
	if err == nil {
		t.Error("Expected error after max retries, got nil")
	}

	// Verify job status is failed
	updatedJob, err := worker.repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Failed to get updated job: %v", err)
	}
	if updatedJob.Status != models.BackupJobStatusFailed {
		t.Errorf("Expected status 'failed', got %s", updatedJob.Status)
	}
	if updatedJob.LastError == nil {
		t.Error("Expected last_error to be set")
	}
	if updatedJob.RetryCount != 3 {
		t.Errorf("Expected retry_count 3 (max), got %d", updatedJob.RetryCount)
	}
	// Verify synced_at is NOT set for failed job (data consistency fix)
	if updatedJob.SyncedAt != nil {
		t.Error("Expected synced_at to be nil for failed job")
	}
}

func TestBackupWorker_ProcessJob_ExpiredTokenRefresh(t *testing.T) {
	worker, _, mockDrive, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up proper test data chain
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, uploadsDir)

	// Create drive connection with expired token (will be refreshed)
	encryptedAccess, _ := services.EncryptToken("old-expired-token")
	encryptedRefresh, _ := services.EncryptToken("test-refresh-token")
	createTestDriveConnection(t, db, user.ID, encryptedAccess, encryptedRefresh)

	idempotencyKey := "token-refresh-key"

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	if err := worker.repo.CreateBackupJob(job); err != nil {
		t.Fatalf("Failed to create job: %v", err)
	}

	var tokenRefreshed bool
	var uploadCalled int32

	// Token is expired, refresh should be called
	mockDrive.IsTokenExpiredFunc = func(expiry time.Time) bool {
		return true // Always expired
	}
	mockDrive.RefreshTokenFunc = func(ctx context.Context, refreshToken string) (*services.TokenResponse, error) {
		tokenRefreshed = true
		return &services.TokenResponse{
			AccessToken: "refreshed-token",
			ExpiresIn:   3600,
			Expiry:      time.Now().Add(time.Hour),
		}, nil
	}
	mockDrive.UploadFileFunc = func(ctx context.Context, accessToken string, content []byte, mimeType, key string) (*services.UploadResult, error) {
		atomic.AddInt32(&uploadCalled, 1)
		// Verify it uses the refreshed token
		if accessToken != "refreshed-token" {
			t.Errorf("Expected refreshed token, got %s", accessToken)
		}
		return &services.UploadResult{DriveFileID: "file-id", Name: "test.jpg"}, nil
	}

	err := worker.processJob(job)
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}

	if !tokenRefreshed {
		t.Error("Expected token to be refreshed")
	}
	if atomic.LoadInt32(&uploadCalled) != 1 {
		t.Errorf("Expected upload called 1 time, got %d", uploadCalled)
	}
}

func TestBackupWorker_ProcessJob_RefreshTokenRotation(t *testing.T) {
	worker, _, mockDrive, db, uploadsDir := setupTestWorker(t)
	if worker == nil {
		return
	}
	defer func() {
		worker.Stop()
		cleanupDriveTestData(t, db)
		os.RemoveAll(uploadsDir)
	}()
	defer db.Close()

	// Set up proper test data chain
	user := createTestUserForWorker(t, db)
	event := createTestEventWithDrive(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID, uploadsDir)

	// Create drive connection with expired token
	encryptedAccess, _ := services.EncryptToken("old-expired-token")
	encryptedRefresh, _ := services.EncryptToken("original-refresh-token")
	createTestDriveConnection(t, db, user.ID, encryptedAccess, encryptedRefresh)

	idempotencyKey := "rotation-test-key"

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	if err := worker.repo.CreateBackupJob(job); err != nil {
		t.Fatalf("Failed to create job: %v", err)
	}

	// Token is expired, refresh should be called with rotated token
	mockDrive.IsTokenExpiredFunc = func(expiry time.Time) bool {
		return true // Always expired
	}
	mockDrive.RefreshTokenFunc = func(ctx context.Context, refreshToken string) (*services.TokenResponse, error) {
		// Return a rotated refresh token
		return &services.TokenResponse{
			AccessToken:  "new-access-token",
			RefreshToken: "new-rotated-refresh-token", // Google returned a new refresh token
			ExpiresIn:    3600,
			Expiry:       time.Now().Add(time.Hour),
		}, nil
	}
	mockDrive.UploadFileFunc = func(ctx context.Context, accessToken string, content []byte, mimeType, key string) (*services.UploadResult, error) {
		return &services.UploadResult{DriveFileID: "file-id", Name: "test.jpg"}, nil
	}

	err := worker.processJob(job)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Verify that the connection was updated with the rotated refresh token
	updatedConn, err := worker.repo.GetDriveConnectionByUserID(user.ID)
	if err != nil {
		t.Fatalf("Failed to get updated connection: %v", err)
	}

	// Decrypt and verify the new refresh token was persisted
	decryptedNewRefresh, err := services.DecryptToken(updatedConn.DriveRefreshTokenEnc)
	if err != nil {
		t.Fatalf("Failed to decrypt refresh token: %v", err)
	}
	if decryptedNewRefresh != "new-rotated-refresh-token" {
		t.Errorf("Expected rotated refresh token to be persisted, got %q", decryptedNewRefresh)
	}
}

// ========== Tests for worker lifecycle ==========

func TestBackupWorker_StartStop(t *testing.T) {
	cfg := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := services.SetDriveEncryptionKey(cfg.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	worker := NewBackupWorker(cfg, nil, nil, 2)

	// Start worker
	worker.Start()

	// Should be running
	if !worker.isRunning() {
		t.Error("Expected worker to be running after Start")
	}

	// Stop worker
	worker.Stop()

	// Should not be running
	if worker.isRunning() {
		t.Error("Expected worker to not be running after Stop")
	}
}

func TestBackupWorker_MultipleStarts(t *testing.T) {
	cfg := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := services.SetDriveEncryptionKey(cfg.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	worker := NewBackupWorker(cfg, nil, nil, 2)

	worker.Start()
	worker.Start() // Second start should be no-op

	if !worker.isRunning() {
		t.Error("Expected worker to be running")
	}

	worker.Stop()
}

// Helper
func cleanupDriveTestData(t *testing.T, db *sql.DB) {
	tables := []string{
		"backup_jobs",
		"drive_connections",
	}
	for _, table := range tables {
		if _, err := db.Exec("DELETE FROM " + table); err != nil {
			t.Logf("Warning: failed to cleanup table %s: %v", table, err)
		}
	}
}

// ========== Tests for mediaTypeToMimeType ==========

func TestMediaTypeToMimeType(t *testing.T) {
	tests := []struct {
		mediaType string
		expected  string
	}{
		{"image", "image/jpeg"},
		{"video", "video/mp4"},
		{"unknown", "application/octet-stream"},
		{"", "application/octet-stream"},
	}

	for _, tt := range tests {
		t.Run(tt.mediaType, func(t *testing.T) {
			result := mediaTypeToMimeType(tt.mediaType)
			if result != tt.expected {
				t.Errorf("mediaTypeToMimeType(%q) = %q, want %q", tt.mediaType, result, tt.expected)
			}
		})
	}
}
