package models

import (
	"time"

	"github.com/google/uuid"
)

// BackupStatus represents the backup status of a postcard
type BackupStatus string

const (
	BackupStatusPending    BackupStatus = "pending"
	BackupStatusQueued     BackupStatus = "queued"
	BackupStatusInProgress BackupStatus = "in_progress"
	BackupStatusSynced     BackupStatus = "synced"
	BackupStatusFailed     BackupStatus = "failed"
)

// DriveConnection represents a user's Google Drive OAuth connection
type DriveConnection struct {
	ID                   uuid.UUID  `json:"id" db:"id"`
	UserID               uuid.UUID  `json:"user_id" db:"user_id"`
	DriveRefreshTokenEnc string     `json:"-" db:"drive_refresh_token_encrypted"` // Encrypted, never exposed to API
	DriveAccessToken     string     `json:"-" db:"drive_access_token"`            // Encrypted, never exposed to API
	TokenExpiry          time.Time  `json:"token_expiry" db:"token_expiry"`
	ConnectedAt          time.Time  `json:"connected_at" db:"connected_at"`
	DisconnectedAt       *time.Time `json:"disconnected_at,omitempty" db:"disconnected_at"`
}

// DriveStatus represents the connection status returned to the API
type DriveStatus struct {
	Connected      bool       `json:"connected"`
	ConnectedAt    *time.Time `json:"connected_at,omitempty"`
	DisconnectedAt *time.Time `json:"disconnected_at,omitempty"`
	LastSyncAt     *time.Time `json:"last_sync_at,omitempty"`
	DriveFolderURL string     `json:"drive_folder_url,omitempty"`
}

// BackupJobStatus represents the status of a backup job
type BackupJobStatus string

const (
	BackupJobStatusQueued     BackupJobStatus = "queued"
	BackupJobStatusInProgress BackupJobStatus = "in_progress"
	BackupJobStatusSynced     BackupJobStatus = "synced"
	BackupJobStatusFailed     BackupJobStatus = "failed"
)

// BackupJob represents a postcard media backup job
type BackupJob struct {
	ID             uuid.UUID       `json:"id" db:"id"`
	PostcardID     uuid.UUID       `json:"postcard_id" db:"postcard_id"`
	IdempotencyKey string          `json:"idempotency_key" db:"idempotency_key"`
	Status         BackupJobStatus `json:"status" db:"status"`
	DriveFileID    *string         `json:"drive_file_id,omitempty" db:"drive_file_id"`
	RetryCount     int             `json:"retry_count" db:"retry_count"`
	LastError      *string         `json:"last_error,omitempty" db:"last_error"`
	QueuedAt       time.Time       `json:"queued_at" db:"queued_at"`
	ProcessedAt    *time.Time      `json:"processed_at,omitempty" db:"processed_at"`
	SyncedAt       *time.Time      `json:"synced_at,omitempty" db:"synced_at"`
}

// BackupJobWithPostcard combines backup job info with postcard info for admin display
type BackupJobWithPostcard struct {
	BackupJob
	PostcardImagePath string    `json:"postcard_image_path" db:"postcard_image_path"`
	PostcardMessage   string    `json:"postcard_message" db:"postcard_message"`
	PlayerName        string    `json:"player_name" db:"player_name"`
	EventID           uuid.UUID `json:"event_id" db:"event_id"`
	EventSlug         string    `json:"event_slug" db:"event_slug"`
}

// DriveBackupConfig holds the feature flag and OAuth configuration
type DriveBackupConfig struct {
	Enabled       bool
	ClientID      string
	ClientSecret  string
	RedirectURI   string
	EncryptionKey string // 32-byte key for AES-256-GCM

	// OAuth endpoints (defaults set in NewDriveService if empty)
	AuthURL        string // Google OAuth authorization URL
	TokenEndpoint  string // OAuth token exchange endpoint
	RevokeEndpoint string // Token revocation endpoint
	APIEndpoint    string // Google Drive API endpoint
}
