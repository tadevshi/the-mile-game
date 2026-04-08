package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

// DriveAdminHandler handles Google Drive OAuth admin operations
type DriveAdminHandler struct {
	driveRepo      *repository.DriveRepository
	eventRepo      *repository.EventRepository
	driveService   DriveServiceOperator
	backupWorker   BackupWorkerEnqueuer
	featureEnabled bool
}

// DriveServiceOperator defines the operations needed from DriveService by DriveAdminHandler
type DriveServiceOperator interface {
	GenerateAuthURL(state string) (string, error)
	ExchangeCode(ctx context.Context, code string) (*services.TokenResponse, error)
	EncryptToken(plaintext string) (string, error)
	DecryptToken(ciphertext string) (string, error)
	RevokeToken(ctx context.Context, token string) error
}

// getStateSigningKey returns the key used for HMAC signing of OAuth state.
// Priority: DRIVE_STATE_SECRET env var > JWT_SECRET env var.
// For MVP, we use a simple shared secret approach.
func getStateSigningKey() string {
	if key := os.Getenv("DRIVE_STATE_SECRET"); key != "" {
		return key
	}
	// Fallback to JWT secret for MVP - in production, use a dedicated key
	if key := os.Getenv("JWT_SECRET"); key != "" {
		return key
	}
	// Hardcoded fallback for development only - will log a warning
	return "development-only-secret-change-in-production"
}

// signState creates an integrity-protected state token.
// Format: base64(user_id:ts:nonce) + "." + hex(HMAC-SHA256(payload))
func signState(userID uuid.UUID) (string, error) {
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	payload := fmt.Sprintf("%s:%d:%s", userID.String(), time.Now().Unix(), hex.EncodeToString(nonce))

	key := getStateSigningKey()
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	// Format: payload.signature
	return base64.URLEncoding.EncodeToString([]byte(payload)) + "." + signature, nil
}

// verifyState verifies and extracts user_id from a signed state token.
// Returns user_id if valid, error if invalid or expired (>10 min old).
func verifyState(signedState string) (uuid.UUID, error) {
	parts := strings.Split(signedState, ".")
	if len(parts) != 2 {
		return uuid.Nil, fmt.Errorf("invalid state format")
	}

	payloadB64, signature := parts[0], parts[1]

	// Decode payload
	payload, err := base64.URLEncoding.DecodeString(payloadB64)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid state encoding")
	}

	// Verify HMAC
	key := getStateSigningKey()
	h := hmac.New(sha256.New, []byte(key))
	h.Write(payload)
	expectedSig := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return uuid.Nil, fmt.Errorf("invalid state signature")
	}

	// Parse payload: user_id:ts:nonce
	parts = strings.Split(string(payload), ":")
	if len(parts) != 3 {
		return uuid.Nil, fmt.Errorf("invalid state payload")
	}

	userID, err := uuid.Parse(parts[0])
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user_id in state")
	}

	// Verify timestamp is within acceptable window (10 minutes)
	ts, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid timestamp in state")
	}

	now := time.Now().Unix()
	if now-ts > 10*60 || ts > now {
		return uuid.Nil, fmt.Errorf("state expired or invalid timestamp")
	}

	return userID, nil
}

// NewDriveAdminHandler creates a new Drive admin handler
func NewDriveAdminHandler(
	driveRepo *repository.DriveRepository,
	eventRepo *repository.EventRepository,
	driveService *services.DriveService,
	backupWorker BackupWorkerEnqueuer,
	featureEnabled bool,
) *DriveAdminHandler {
	return &DriveAdminHandler{
		driveRepo:      driveRepo,
		eventRepo:      eventRepo,
		driveService:   driveService,
		backupWorker:   backupWorker,
		featureEnabled: featureEnabled,
	}
}

// GetDriveAuthURL GET /api/admin/drive/auth-url
// Returns Google OAuth URL for Drive connection
// Requires auth - user_id is encoded in state parameter for callback
func (h *DriveAdminHandler) GetDriveAuthURL(c *gin.Context) {
	if !h.featureEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google Drive backup is not enabled"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Create integrity-protected signed state for OAuth CSRF protection
	signedState, err := signState(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create state: " + err.Error()})
		return
	}

	authURL, err := h.driveService.GenerateAuthURL(signedState)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate auth URL: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"auth_url": authURL,
		"state":    signedState,
	})
}

// GetDriveCallback GET /api/admin/drive/callback
// Handles Google OAuth callback, exchanges code for tokens and stores them.
// This endpoint is called by Google's redirect - it decodes user_id from state parameter.
func (h *DriveAdminHandler) GetDriveCallback(c *gin.Context) {
	if !h.featureEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google Drive backup is not enabled"})
		return
	}

	code := c.Query("code")
	stateParam := c.Query("state")
	errorParam := c.Query("error")

	if errorParam != "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "oauth_error",
			"message": "Google OAuth error: " + errorParam,
		})
		return
	}

	if code == "" || stateParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code or state parameter"})
		return
	}

	// Verify signed state and extract user_id (validates HMAC + timestamp)
	userID, err := verifyState(stateParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state: " + err.Error()})
		return
	}

	// Exchange code for tokens
	tokenResp, err := h.driveService.ExchangeCode(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to exchange code: " + err.Error()})
		return
	}

	// Encrypt tokens for storage
	encryptedAccess, err := h.driveService.EncryptToken(tokenResp.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt access token"})
		return
	}

	encryptedRefresh, err := h.driveService.EncryptToken(tokenResp.RefreshToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt refresh token"})
		return
	}

	// Store connection in database
	conn := &models.DriveConnection{
		ID:                   uuid.New(),
		UserID:               userID,
		DriveRefreshTokenEnc: encryptedRefresh,
		DriveAccessToken:     encryptedAccess,
		TokenExpiry:          tokenResp.Expiry,
		ConnectedAt:          time.Now(),
	}

	if err := h.driveRepo.UpsertDriveConnection(conn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store drive connection"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Google Drive connected successfully",
		"connected_at": conn.ConnectedAt,
		"token_expiry": conn.TokenExpiry,
	})
}

// GetDriveStatus GET /api/admin/drive/status
// Returns the current Drive connection status for the authenticated user
func (h *DriveAdminHandler) GetDriveStatus(c *gin.Context) {
	if !h.featureEnabled {
		c.JSON(http.StatusOK, gin.H{
			"connected":    false,
			"enabled":      false,
			"last_sync_at": nil,
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	conn, err := h.driveRepo.GetDriveConnectionByUserID(userID.(uuid.UUID))
	if err != nil {
		// No connection found - return disconnected status
		c.JSON(http.StatusOK, gin.H{
			"connected": false,
			"enabled":   true,
		})
		return
	}

	// Get last sync time
	lastSync, _ := h.driveRepo.GetLastSyncTime(userID.(uuid.UUID))

	status := &models.DriveStatus{
		Connected:      true,
		ConnectedAt:    &conn.ConnectedAt,
		DisconnectedAt: conn.DisconnectedAt,
		LastSyncAt:     lastSync,
	}

	c.JSON(http.StatusOK, status)
}

// DisconnectDrive POST /api/admin/drive/disconnect
// Revokes the OAuth token and removes the Drive connection
func (h *DriveAdminHandler) DisconnectDrive(c *gin.Context) {
	if !h.featureEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google Drive backup is not enabled"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get current connection to revoke token
	conn, err := h.driveRepo.GetDriveConnectionByUserID(userID.(uuid.UUID))
	if err != nil {
		// No connection to disconnect
		c.JSON(http.StatusOK, gin.H{"message": "No active connection to disconnect"})
		return
	}

	// Revoke the refresh token at Google
	refreshToken, err := h.driveService.DecryptToken(conn.DriveRefreshTokenEnc)
	if err == nil {
		// Best effort - ignore errors
		h.driveService.RevokeToken(c.Request.Context(), refreshToken)
	}

	// Soft delete the connection
	if err := h.driveRepo.DeleteDriveConnectionByUserID(userID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect drive"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Google Drive disconnected successfully"})
}

// ListBackupJobs GET /api/admin/drive/backup-jobs
// Lists backup jobs for the authenticated user (jobs from events they own)
func (h *DriveAdminHandler) ListBackupJobs(c *gin.Context) {
	if !h.featureEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google Drive backup is not enabled"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	eventIDStr := c.Query("event_id")
	var eventID *uuid.UUID
	if eventIDStr != "" {
		id, err := uuid.Parse(eventIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event_id"})
			return
		}
		eventID = &id

		// Verify ownership
		event, err := h.eventRepo.GetByID(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			return
		}
		if event.OwnerID != userID.(uuid.UUID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view jobs for this event"})
			return
		}
	}

	var jobs []models.BackupJobWithPostcard
	var err error

	if eventID != nil {
		jobs, err = h.driveRepo.ListBackupJobsByEvent(*eventID)
	} else {
		// Get all events owned by this user and list their jobs
		events, evErr := h.eventRepo.ListByOwner(userID.(uuid.UUID))
		if evErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get events"})
			return
		}
		for _, event := range events {
			eventJobs, jobErr := h.driveRepo.ListBackupJobsByEvent(event.ID)
			if jobErr != nil {
				continue
			}
			jobs = append(jobs, eventJobs...)
		}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list backup jobs"})
		return
	}

	if jobs == nil {
		jobs = []models.BackupJobWithPostcard{}
	}

	c.JSON(http.StatusOK, gin.H{
		"jobs":  jobs,
		"total": len(jobs),
	})
}

// RetryBackupJob POST /api/admin/drive/backup-jobs/:id/retry
// Re-queues a failed backup job for retry
func (h *DriveAdminHandler) RetryBackupJob(c *gin.Context) {
	if !h.featureEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google Drive backup is not enabled"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	jobIDStr := c.Param("id")
	jobID, err := uuid.Parse(jobIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	// Get job to verify ownership via postcard -> event
	// We need to find the job by ID - use the workaround of listing events and finding the job
	events, err := h.eventRepo.ListByOwner(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify ownership"})
		return
	}

	var targetJob *models.BackupJobWithPostcard
	for _, event := range events {
		jobs, err := h.driveRepo.ListBackupJobsByEvent(event.ID)
		if err != nil {
			continue
		}
		for _, j := range jobs {
			if j.ID == jobID {
				targetJob = &j
				break
			}
		}
		if targetJob != nil {
			break
		}
	}

	if targetJob == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup job not found"})
		return
	}

	// Reset job status to queued for retry
	if err := h.driveRepo.UpdateBackupJobStatus(jobID, models.BackupJobStatusQueued, nil, nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retry job"})
		return
	}

	// Create new idempotency key for retry
	idempotencyKey := fmt.Sprintf("%s:retry:%d", targetJob.PostcardID.String(), time.Now().UnixNano())

	// Re-enqueue the job
	if err := h.backupWorker.EnqueueBackupJob(targetJob.PostcardID, idempotencyKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enqueue retry job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Job re-queued for retry",
		"job_id":  jobID,
	})
}
