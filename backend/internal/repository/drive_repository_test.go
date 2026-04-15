package repository

import (
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// cleanupDriveTestData cleans up drive-related test data
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

// createTestUser creates a test user (helper reused from event_repository_test.go)
func createTestUserForDrive(t *testing.T, db *sql.DB) *models.User {
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

// createTestEventWithCorkboard creates a test event with corkboard feature
func createTestEventWithCorkboard(t *testing.T, db *sql.DB, ownerID uuid.UUID) *models.Event {
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
func createTestPostcard(t *testing.T, db *sql.DB, eventID uuid.UUID, playerID *uuid.UUID) *models.Postcard {
	postcard := &models.Postcard{
		ID:        uuid.New(),
		EventID:   eventID,
		PlayerID:  playerID,
		ImagePath: "/uploads/test-" + uuid.New().String()[:8] + ".jpg",
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

	return postcard
}

// ========== TESTS FOR DriveRepository ==========

func TestUpsertDriveConnection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	repo := NewDriveRepository(db)

	conn := &models.DriveConnection{
		ID:                   uuid.New(),
		UserID:               user.ID,
		DriveRefreshTokenEnc: "encrypted-refresh-token",
		DriveAccessToken:     "encrypted-access-token",
		TokenExpiry:          time.Now().Add(time.Hour),
		ConnectedAt:          time.Now(),
	}

	// First insert
	err := repo.UpsertDriveConnection(conn)
	if err != nil {
		t.Fatalf("Expected no error on insert, got: %v", err)
	}

	// Verify insert
	stored, err := repo.GetDriveConnectionByUserID(user.ID)
	if err != nil {
		t.Fatalf("Expected no error on get, got: %v", err)
	}
	if stored.ID != conn.ID {
		t.Errorf("Expected ID %v, got %v", conn.ID, stored.ID)
	}
	if stored.DriveRefreshTokenEnc != "encrypted-refresh-token" {
		t.Errorf("Expected refresh token 'encrypted-refresh-token', got %q", stored.DriveRefreshTokenEnc)
	}

	// Update existing
	conn.DriveAccessToken = "new-encrypted-access-token"
	conn.TokenExpiry = time.Now().Add(2 * time.Hour)
	err = repo.UpsertDriveConnection(conn)
	if err != nil {
		t.Fatalf("Expected no error on update, got: %v", err)
	}

	// Verify update - should still have same connection ID
	stored, err = repo.GetDriveConnectionByUserID(user.ID)
	if err != nil {
		t.Fatalf("Expected no error on get after update, got: %v", err)
	}
	if stored.ID != conn.ID {
		t.Errorf("Expected ID %v (unchanged), got %v", conn.ID, stored.ID)
	}
	if stored.DriveAccessToken != "new-encrypted-access-token" {
		t.Errorf("Expected updated access token, got %q", stored.DriveAccessToken)
	}
}

func TestGetDriveConnectionByUserID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	repo := NewDriveRepository(db)

	_, err := repo.GetDriveConnectionByUserID(uuid.New())
	if err == nil {
		t.Error("Expected error for non-existent user connection, got nil")
	}
}

func TestGetDriveConnectionByUserID_Disconnected(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	repo := NewDriveRepository(db)

	conn := &models.DriveConnection{
		ID:                   uuid.New(),
		UserID:               user.ID,
		DriveRefreshTokenEnc: "encrypted-token",
		DriveAccessToken:     "encrypted-access",
		TokenExpiry:          time.Now().Add(time.Hour),
		ConnectedAt:          time.Now(),
	}

	err := repo.UpsertDriveConnection(conn)
	if err != nil {
		t.Fatalf("Failed to insert connection: %v", err)
	}

	// Disconnect
	err = repo.DeleteDriveConnectionByUserID(user.ID)
	if err != nil {
		t.Fatalf("Failed to disconnect: %v", err)
	}

	// Get should return error (soft deleted)
	_, err = repo.GetDriveConnectionByUserID(user.ID)
	if err == nil {
		t.Error("Expected error for disconnected user connection, got nil")
	}
}

func TestDeleteDriveConnectionByUserID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	repo := NewDriveRepository(db)

	conn := &models.DriveConnection{
		ID:                   uuid.New(),
		UserID:               user.ID,
		DriveRefreshTokenEnc: "encrypted-token",
		DriveAccessToken:     "encrypted-access",
		TokenExpiry:          time.Now().Add(time.Hour),
		ConnectedAt:          time.Now(),
	}

	err := repo.UpsertDriveConnection(conn)
	if err != nil {
		t.Fatalf("Failed to insert connection: %v", err)
	}

	err = repo.DeleteDriveConnectionByUserID(user.ID)
	if err != nil {
		t.Fatalf("Expected no error on delete, got: %v", err)
	}

	// Verify disconnected_at is set
	stored, err := repo.getDisconnectedConnection(user.ID)
	if err != nil {
		t.Fatalf("Expected to find disconnected connection, got: %v", err)
	}
	if stored.DisconnectedAt == nil {
		t.Error("Expected disconnected_at to be set")
	}
}

// ========== TESTS FOR BackupJobRepository ==========

func TestCreateBackupJob(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event := createTestEventWithCorkboard(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID)

	repo := NewDriveRepository(db)

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: "test-idempotency-key",
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}

	err := repo.CreateBackupJob(job)
	if err != nil {
		t.Fatalf("Expected no error on insert, got: %v", err)
	}

	// Verify job was created
	jobFromDB, err := repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Expected no error on get, got: %v", err)
	}
	if jobFromDB.ID != job.ID {
		t.Errorf("Expected job ID %v, got %v", job.ID, jobFromDB.ID)
	}
	if jobFromDB.Status != models.BackupJobStatusQueued {
		t.Errorf("Expected status 'queued', got %q", jobFromDB.Status)
	}
	if jobFromDB.IdempotencyKey != "test-idempotency-key" {
		t.Errorf("Expected idempotency key 'test-idempotency-key', got %q", jobFromDB.IdempotencyKey)
	}
}

func TestCreateBackupJob_Idempotency(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event := createTestEventWithCorkboard(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID)

	repo := NewDriveRepository(db)

	job1 := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: "same-key",
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}

	err := repo.CreateBackupJob(job1)
	if err != nil {
		t.Fatalf("First insert failed: %v", err)
	}

	// Try to insert with same idempotency key - should fail
	job2 := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: "same-key",
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}

	err = repo.CreateBackupJob(job2)
	if err == nil {
		t.Error("Expected error for duplicate idempotency key, got nil")
	}
}

func TestUpdateBackupJobStatus(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event := createTestEventWithCorkboard(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID)

	repo := NewDriveRepository(db)

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: "update-test-key",
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	repo.CreateBackupJob(job)

	// Update to in_progress
	driveFileID := "drive-file-123"
	err := repo.UpdateBackupJobStatus(job.ID, models.BackupJobStatusInProgress, &driveFileID, nil)
	if err != nil {
		t.Fatalf("Expected no error on status update, got: %v", err)
	}

	// Verify
	updated, err := repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Expected no error on get, got: %v", err)
	}
	if updated.Status != models.BackupJobStatusInProgress {
		t.Errorf("Expected status 'in_progress', got %q", updated.Status)
	}
	if updated.DriveFileID == nil || *updated.DriveFileID != driveFileID {
		t.Errorf("Expected drive_file_id %q, got %v", driveFileID, updated.DriveFileID)
	}

	// Update to synced
	err = repo.UpdateBackupJobStatus(job.ID, models.BackupJobStatusSynced, &driveFileID, nil)
	if err != nil {
		t.Fatalf("Expected no error on sync status update, got: %v", err)
	}

	// Verify
	updated, err = repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Expected no error on get, got: %v", err)
	}
	if updated.Status != models.BackupJobStatusSynced {
		t.Errorf("Expected status 'synced', got %q", updated.Status)
	}
	if updated.ProcessedAt == nil {
		t.Error("Expected processed_at to be set")
	}
	if updated.SyncedAt == nil {
		t.Error("Expected synced_at to be set")
	}
}

func TestUpdateBackupJobStatus_Failed(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event := createTestEventWithCorkboard(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID)

	repo := NewDriveRepository(db)

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: "fail-test-key",
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	repo.CreateBackupJob(job)

	// Update to failed with error
	errMsg := "network timeout"
	err := repo.UpdateBackupJobStatus(job.ID, models.BackupJobStatusFailed, nil, &errMsg)
	if err != nil {
		t.Fatalf("Expected no error on failed status update, got: %v", err)
	}

	// Verify
	updated, err := repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Expected no error on get, got: %v", err)
	}
	if updated.Status != models.BackupJobStatusFailed {
		t.Errorf("Expected status 'failed', got %q", updated.Status)
	}
	if updated.LastError == nil || *updated.LastError != errMsg {
		t.Errorf("Expected last_error %q, got %v", errMsg, updated.LastError)
	}
	if updated.RetryCount != 0 {
		t.Errorf("Expected retry_count 0, got %d", updated.RetryCount)
	}
	// Verify processed_at is set but synced_at is NOT set for failed jobs (data consistency fix)
	if updated.ProcessedAt == nil {
		t.Error("Expected processed_at to be set for failed job")
	}
	if updated.SyncedAt != nil {
		t.Error("Expected synced_at to be nil for failed job (data consistency)")
	}
}

func TestIncrementRetryCount(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event := createTestEventWithCorkboard(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard := createTestPostcard(t, db, event.ID, &player.ID)

	repo := NewDriveRepository(db)

	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcard.ID,
		IdempotencyKey: "retry-test-key",
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}
	repo.CreateBackupJob(job)

	// Increment retry
	err := repo.IncrementRetryCount(job.ID)
	if err != nil {
		t.Fatalf("Expected no error on increment, got: %v", err)
	}

	updated, err := repo.GetBackupJobByPostcardID(postcard.ID)
	if err != nil {
		t.Fatalf("Expected no error on get, got: %v", err)
	}
	if updated.RetryCount != 1 {
		t.Errorf("Expected retry_count 1, got %d", updated.RetryCount)
	}

	// Increment again
	repo.IncrementRetryCount(job.ID)
	updated, _ = repo.GetBackupJobByPostcardID(postcard.ID)
	if updated.RetryCount != 2 {
		t.Errorf("Expected retry_count 2, got %d", updated.RetryCount)
	}
}

func TestListBackupJobsByEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event1 := createTestEventWithCorkboard(t, db, user.ID)
	event2 := createTestEventWithCorkboard(t, db, user.ID)
	player1 := createTestPlayer(t, db, event1.ID)
	player2 := createTestPlayer(t, db, event2.ID)
	postcard1 := createTestPostcard(t, db, event1.ID, &player1.ID)
	postcard2 := createTestPostcard(t, db, event1.ID, &player1.ID)
	createTestPostcard(t, db, event2.ID, &player2.ID) // different event

	repo := NewDriveRepository(db)

	// Create jobs for event1 postcards
	repo.CreateBackupJob(&models.BackupJob{
		ID: uuid.New(), PostcardID: postcard1.ID,
		IdempotencyKey: "event1-job-1", Status: models.BackupJobStatusQueued, QueuedAt: time.Now(),
	})
	repo.CreateBackupJob(&models.BackupJob{
		ID: uuid.New(), PostcardID: postcard2.ID,
		IdempotencyKey: "event1-job-2", Status: models.BackupJobStatusSynced, QueuedAt: time.Now(),
	})

	// List jobs for event1
	jobs, err := repo.ListBackupJobsByEvent(event1.ID)
	if err != nil {
		t.Fatalf("Expected no error on list, got: %v", err)
	}
	if len(jobs) != 2 {
		t.Errorf("Expected 2 jobs for event1, got %d", len(jobs))
	}

	// List jobs for event2
	jobs2, err := repo.ListBackupJobsByEvent(event2.ID)
	if err != nil {
		t.Fatalf("Expected no error on list, got: %v", err)
	}
	if len(jobs2) != 0 {
		t.Errorf("Expected 0 jobs for event2, got %d", len(jobs2))
	}
}

func TestGetQueuedBackupJobs(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	user := createTestUserForDrive(t, db)
	event := createTestEventWithCorkboard(t, db, user.ID)
	player := createTestPlayer(t, db, event.ID)
	postcard1 := createTestPostcard(t, db, event.ID, &player.ID)
	postcard2 := createTestPostcard(t, db, event.ID, &player.ID)
	postcard3 := createTestPostcard(t, db, event.ID, &player.ID)

	repo := NewDriveRepository(db)

	// Create jobs with different statuses
	repo.CreateBackupJob(&models.BackupJob{
		ID: uuid.New(), PostcardID: postcard1.ID,
		IdempotencyKey: "queued-1", Status: models.BackupJobStatusQueued, QueuedAt: time.Now(),
	})
	repo.CreateBackupJob(&models.BackupJob{
		ID: uuid.New(), PostcardID: postcard2.ID,
		IdempotencyKey: "in-progress-1", Status: models.BackupJobStatusInProgress, QueuedAt: time.Now(),
	})
	repo.CreateBackupJob(&models.BackupJob{
		ID: uuid.New(), PostcardID: postcard3.ID,
		IdempotencyKey: "synced-1", Status: models.BackupJobStatusSynced, QueuedAt: time.Now(),
	})

	// Get queued jobs - should only return 'queued' jobs, not 'in_progress'
	queued, err := repo.GetQueuedBackupJobs(10)
	if err != nil {
		t.Fatalf("Expected no error on get queued, got: %v", err)
	}
	if len(queued) != 1 {
		t.Errorf("Expected 1 queued job, got %d", len(queued))
	}
}

func TestGetBackupJobByPostcardID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupDriveTestData(t, db)

	repo := NewDriveRepository(db)

	_, err := repo.GetBackupJobByPostcardID(uuid.New())
	if err == nil {
		t.Error("Expected error for non-existent postcard job, got nil")
	}
}
