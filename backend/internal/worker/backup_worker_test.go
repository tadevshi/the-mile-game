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

	// Register first so each test's deferred worker stop and data cleanup run before close.
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("Failed to close test database: %v", err)
		}
	})

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

	// Track multipart upload calls and validate folder routing.
	expectDriveFolders(t, mockDrive, "decrypted-token", 1)
	var uploadCalled int32
	mockDrive.UploadFileMultipartFunc = func(ctx context.Context, accessToken string, content []byte, filename, mimeType, key string, parentID *string) (*services.UploadResult, error) {
		assertMultipartUploadArgs(t, postcard, idempotencyKey, "decrypted-token", accessToken, content, filename, mimeType, key, parentID)
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
	assertSyncedJob(t, worker.repo, postcard.ID, idempotencyKey, "uploaded-file-id", 0)
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

	// Make upload fail twice, then succeed.
	expectDriveFolders(t, mockDrive, "decrypted-token", 3)
	var callCount int32
	mockDrive.UploadFileMultipartFunc = func(ctx context.Context, accessToken string, content []byte, filename, mimeType, key string, parentID *string) (*services.UploadResult, error) {
		assertMultipartUploadArgs(t, postcard, idempotencyKey, "decrypted-token", accessToken, content, filename, mimeType, key, parentID)
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
	assertSyncedJob(t, worker.repo, postcard.ID, idempotencyKey, "uploaded-on-retry", 2)
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

	// Initial attempt plus three retries must all use the multipart interface.
	expectDriveFolders(t, mockDrive, "decrypted-token", 4)
	var uploadCalled int32
	mockDrive.UploadFileMultipartFunc = func(ctx context.Context, accessToken string, content []byte, filename, mimeType, key string, parentID *string) (*services.UploadResult, error) {
		assertMultipartUploadArgs(t, postcard, idempotencyKey, "decrypted-token", accessToken, content, filename, mimeType, key, parentID)
		atomic.AddInt32(&uploadCalled, 1)
		return nil, errors.New("persistent error")
	}

	// Process should fail after max retries
	err := worker.processJob(job)
	if err == nil {
		t.Error("Expected error after max retries, got nil")
	}

	if atomic.LoadInt32(&uploadCalled) != 4 {
		t.Errorf("Expected 4 upload attempts, got %d", uploadCalled)
	}
	if err != nil && err.Error() != "persistent error" {
		t.Errorf("Expected persistent upload error, got %v", err)
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
	if updatedJob.LastError != nil && *updatedJob.LastError != "upload failed after 3 retries: persistent error" {
		t.Errorf("Unexpected persisted last_error: %q", *updatedJob.LastError)
	}
	if updatedJob.DriveFileID != nil {
		t.Error("Expected no drive_file_id for failed job")
	}
	if updatedJob.ProcessedAt == nil {
		t.Error("Expected processed_at for failed job")
	}
	if updatedJob.IdempotencyKey != idempotencyKey {
		t.Errorf("Expected unchanged idempotency key %q, got %q", idempotencyKey, updatedJob.IdempotencyKey)
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

	expectDriveFolders(t, mockDrive, "refreshed-token", 1)
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
	mockDrive.UploadFileMultipartFunc = func(ctx context.Context, accessToken string, content []byte, filename, mimeType, key string, parentID *string) (*services.UploadResult, error) {
		assertMultipartUploadArgs(t, postcard, idempotencyKey, "refreshed-token", accessToken, content, filename, mimeType, key, parentID)
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

	assertSyncedJob(t, worker.repo, postcard.ID, idempotencyKey, "file-id", 0)
	updatedConn, err := worker.repo.GetDriveConnectionByUserID(user.ID)
	if err != nil {
		t.Fatalf("Failed to get refreshed connection: %v", err)
	}
	persistedAccess, err := services.DecryptToken(updatedConn.DriveAccessToken)
	if err != nil || persistedAccess != "refreshed-token" {
		t.Errorf("Expected persisted refreshed access token, got %q, error %v", persistedAccess, err)
	}
	if !updatedConn.TokenExpiry.After(time.Now()) {
		t.Error("Expected refreshed token expiry in the future")
	}
	if updatedConn.DriveRefreshTokenEnc != encryptedRefresh {
		t.Error("Expected original refresh token preserved when no rotation returned")
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
	expectDriveFolders(t, mockDrive, "new-access-token", 1)
	var uploadCalled int32
	mockDrive.UploadFileMultipartFunc = func(ctx context.Context, accessToken string, content []byte, filename, mimeType, key string, parentID *string) (*services.UploadResult, error) {
		assertMultipartUploadArgs(t, postcard, idempotencyKey, "new-access-token", accessToken, content, filename, mimeType, key, parentID)
		atomic.AddInt32(&uploadCalled, 1)
		return &services.UploadResult{DriveFileID: "file-id", Name: "test.jpg"}, nil
	}

	err := worker.processJob(job)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if atomic.LoadInt32(&uploadCalled) != 1 {
		t.Errorf("Expected upload called 1 time, got %d", uploadCalled)
	}
	assertSyncedJob(t, worker.repo, postcard.ID, idempotencyKey, "file-id", 0)

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

// expectDriveFolders checks routing without defining an event-folder naming contract.
func expectDriveFolders(t *testing.T, mock *MockDriveService, token string, attempts int) {
	t.Helper()
	calls := 0
	mock.EnsureFolderFunc = func(ctx context.Context, accessToken, folderName string, parentID *string) (string, error) {
		if accessToken != token {
			t.Errorf("Expected folder access token %q, got %q", token, accessToken)
		}
		calls++
		if calls%2 == 1 {
			if folderName != "EventHub Backups" || parentID != nil {
				t.Errorf("Expected root EventHub Backups folder, got name %q, parent %v", folderName, parentID)
			}
			return "base-folder-id", nil
		}
		if parentID == nil || *parentID != "base-folder-id" {
			t.Errorf("Expected event folder under base-folder-id, got %v", parentID)
		}
		return "event-folder-id", nil
	}
	t.Cleanup(func() {
		if calls != 2*attempts {
			t.Errorf("Expected %d ordered folder calls, got %d", 2*attempts, calls)
		}
	})
}

func assertMultipartUploadArgs(t *testing.T, postcard *models.Postcard, expectedKey, expectedToken, token string, content []byte, filename, mimeType, key string, parentID *string) {
	t.Helper()
	if token != expectedToken {
		t.Errorf("Expected upload access token %q, got %q", expectedToken, token)
	}
	if string(content) != "fake image content for testing" {
		t.Errorf("Unexpected uploaded content: %q", content)
	}
	if filename != filepath.Base(postcard.ImagePath) {
		t.Errorf("Expected filename %q, got %q", filepath.Base(postcard.ImagePath), filename)
	}
	if mimeType != "image/jpeg" {
		t.Errorf("Expected MIME type image/jpeg, got %q", mimeType)
	}
	if key != expectedKey {
		t.Errorf("Expected idempotency key %q, got %q", expectedKey, key)
	}
	if parentID == nil || *parentID != "event-folder-id" {
		t.Errorf("Expected upload into event-folder-id, got %v", parentID)
	}
}

func assertSyncedJob(t *testing.T, repo *repository.DriveRepository, postcardID uuid.UUID, key, fileID string, retries int) {
	t.Helper()
	job, err := repo.GetBackupJobByPostcardID(postcardID)
	if err != nil {
		t.Fatalf("Failed to get synced job: %v", err)
	}
	if job.Status != models.BackupJobStatusSynced {
		t.Errorf("Expected synced status, got %s", job.Status)
	}
	if job.DriveFileID == nil || *job.DriveFileID != fileID {
		t.Errorf("Expected persisted drive file ID %q, got %v", fileID, job.DriveFileID)
	}
	if job.RetryCount != retries {
		t.Errorf("Expected %d persisted retries, got %d", retries, job.RetryCount)
	}
	if job.LastError != nil {
		t.Errorf("Expected no last_error after success, got %q", *job.LastError)
	}
	if job.ProcessedAt == nil || job.SyncedAt == nil {
		t.Error("Expected processed_at and synced_at after success")
	}
	if job.IdempotencyKey != key {
		t.Errorf("Expected unchanged idempotency key %q, got %q", key, job.IdempotencyKey)
	}
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
