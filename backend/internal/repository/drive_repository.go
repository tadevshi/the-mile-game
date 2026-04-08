package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// DriveRepository handles database operations for Drive connections and backup jobs
type DriveRepository struct {
	db *sql.DB
}

// NewDriveRepository creates a new Drive repository
func NewDriveRepository(db *sql.DB) *DriveRepository {
	return &DriveRepository{db: db}
}

// ========== DriveConnection operations ==========

// UpsertDriveConnection inserts or updates a Drive connection
func (r *DriveRepository) UpsertDriveConnection(conn *models.DriveConnection) error {
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
	_, err := r.db.Exec(query, conn.ID, conn.UserID, conn.DriveRefreshTokenEnc, conn.DriveAccessToken, conn.TokenExpiry, conn.ConnectedAt)
	return err
}

// GetDriveConnectionByUserID gets an active (non-disconnected) Drive connection for a user
func (r *DriveRepository) GetDriveConnectionByUserID(userID uuid.UUID) (*models.DriveConnection, error) {
	query := `
		SELECT id, user_id, drive_refresh_token_encrypted, drive_access_token, token_expiry, connected_at, disconnected_at
		FROM drive_connections
		WHERE user_id = $1 AND disconnected_at IS NULL
	`
	conn := &models.DriveConnection{}
	var disconnectedAt sql.NullTime

	err := r.db.QueryRow(query, userID).Scan(
		&conn.ID, &conn.UserID, &conn.DriveRefreshTokenEnc, &conn.DriveAccessToken,
		&conn.TokenExpiry, &conn.ConnectedAt, &disconnectedAt,
	)
	if err != nil {
		return nil, err
	}
	if disconnectedAt.Valid {
		conn.DisconnectedAt = &disconnectedAt.Time
	}
	return conn, nil
}

// getDisconnectedConnection gets a Drive connection including disconnected ones (for admin display)
func (r *DriveRepository) getDisconnectedConnection(userID uuid.UUID) (*models.DriveConnection, error) {
	query := `
		SELECT id, user_id, drive_refresh_token_encrypted, drive_access_token, token_expiry, connected_at, disconnected_at
		FROM drive_connections
		WHERE user_id = $1
	`
	conn := &models.DriveConnection{}
	var disconnectedAt sql.NullTime

	err := r.db.QueryRow(query, userID).Scan(
		&conn.ID, &conn.UserID, &conn.DriveRefreshTokenEnc, &conn.DriveAccessToken,
		&conn.TokenExpiry, &conn.ConnectedAt, &disconnectedAt,
	)
	if err != nil {
		return nil, err
	}
	if disconnectedAt.Valid {
		conn.DisconnectedAt = &disconnectedAt.Time
	}
	return conn, nil
}

// DeleteDriveConnectionByUserID soft-deletes a Drive connection by setting disconnected_at
func (r *DriveRepository) DeleteDriveConnectionByUserID(userID uuid.UUID) error {
	query := `
		UPDATE drive_connections
		SET disconnected_at = $2
		WHERE user_id = $1 AND disconnected_at IS NULL
	`
	result, err := r.db.Exec(query, userID, time.Now())
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("no active connection found for user")
	}
	return nil
}

// ========== BackupJob operations ==========

// CreateBackupJob creates a new backup job with idempotency key
func (r *DriveRepository) CreateBackupJob(job *models.BackupJob) error {
	query := `
		INSERT INTO backup_jobs (id, postcard_id, idempotency_key, status, retry_count, queued_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query, job.ID, job.PostcardID, job.IdempotencyKey, job.Status, job.RetryCount, job.QueuedAt)
	return err
}

// GetBackupJobByPostcardID gets a backup job by postcard ID
func (r *DriveRepository) GetBackupJobByPostcardID(postcardID uuid.UUID) (*models.BackupJob, error) {
	query := `
		SELECT id, postcard_id, idempotency_key, status, drive_file_id, retry_count, last_error, queued_at, processed_at, synced_at
		FROM backup_jobs
		WHERE postcard_id = $1
	`
	job := &models.BackupJob{}
	var driveFileID, lastError sql.NullString
	var processedAt, syncedAt sql.NullTime

	err := r.db.QueryRow(query, postcardID).Scan(
		&job.ID, &job.PostcardID, &job.IdempotencyKey, &job.Status,
		&driveFileID, &job.RetryCount, &lastError,
		&job.QueuedAt, &processedAt, &syncedAt,
	)
	if err != nil {
		return nil, err
	}
	if driveFileID.Valid {
		job.DriveFileID = &driveFileID.String
	}
	if lastError.Valid {
		job.LastError = &lastError.String
	}
	if processedAt.Valid {
		job.ProcessedAt = &processedAt.Time
	}
	if syncedAt.Valid {
		job.SyncedAt = &syncedAt.Time
	}
	return job, nil
}

// UpdateBackupJobStatus updates the status of a backup job
func (r *DriveRepository) UpdateBackupJobStatus(jobID uuid.UUID, status models.BackupJobStatus, driveFileID *string, lastError *string) error {
	var query string
	var args []interface{}

	now := time.Now()

	if status == models.BackupJobStatusSynced {
		// Synced status: set both processed_at and synced_at
		query = `
			UPDATE backup_jobs
			SET status = $1, drive_file_id = $2, last_error = $3, processed_at = $4, synced_at = $5
			WHERE id = $6
		`
		args = []interface{}{status, driveFileID, lastError, now, now, jobID}
	} else if status == models.BackupJobStatusFailed {
		// Failed status: set processed_at but NOT synced_at (job did not complete)
		query = `
			UPDATE backup_jobs
			SET status = $1, drive_file_id = $2, last_error = $3, processed_at = $4
			WHERE id = $5
		`
		args = []interface{}{status, driveFileID, lastError, now, jobID}
	} else {
		query = `
			UPDATE backup_jobs
			SET status = $1, drive_file_id = $2, last_error = $3
			WHERE id = $4
		`
		args = []interface{}{status, driveFileID, lastError, jobID}
	}

	_, err := r.db.Exec(query, args...)
	return err
}

// IncrementRetryCount increments the retry count for a job
func (r *DriveRepository) IncrementRetryCount(jobID uuid.UUID) error {
	query := `UPDATE backup_jobs SET retry_count = retry_count + 1 WHERE id = $1`
	_, err := r.db.Exec(query, jobID)
	return err
}

// ListBackupJobsByEvent lists all backup jobs for postcards belonging to an event
func (r *DriveRepository) ListBackupJobsByEvent(eventID uuid.UUID) ([]models.BackupJobWithPostcard, error) {
	query := `
		SELECT
			bj.id, bj.postcard_id, bj.idempotency_key, bj.status, bj.drive_file_id,
			bj.retry_count, bj.last_error, bj.queued_at, bj.processed_at, bj.synced_at,
			p.image_path, p.message, COALESCE(pl.name, 'Invitado') AS player_name, p.event_id, e.slug
		FROM backup_jobs bj
		JOIN postcards p ON bj.postcard_id = p.id
		JOIN events e ON p.event_id = e.id
		LEFT JOIN players pl ON p.player_id = pl.id
		WHERE p.event_id = $1
		ORDER BY bj.queued_at DESC
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []models.BackupJobWithPostcard
	for rows.Next() {
		var job models.BackupJobWithPostcard
		var driveFileID, lastError sql.NullString
		var processedAt, syncedAt sql.NullTime

		err := rows.Scan(
			&job.ID, &job.PostcardID, &job.IdempotencyKey, &job.Status,
			&driveFileID, &job.RetryCount, &lastError,
			&job.QueuedAt, &processedAt, &syncedAt,
			&job.PostcardImagePath, &job.PostcardMessage, &job.PlayerName, &job.EventID, &job.EventSlug,
		)
		if err != nil {
			return nil, err
		}
		if driveFileID.Valid {
			job.DriveFileID = &driveFileID.String
		}
		if lastError.Valid {
			job.LastError = &lastError.String
		}
		if processedAt.Valid {
			job.ProcessedAt = &processedAt.Time
		}
		if syncedAt.Valid {
			job.SyncedAt = &syncedAt.Time
		}
		jobs = append(jobs, job)
	}

	return jobs, nil
}

// GetQueuedBackupJobs gets jobs that are queued for worker processing.
// Only 'queued' status is returned; 'in_progress' jobs are not re-fetched
// to prevent duplicate processing. Workers claim jobs atomically via
// UpdateBackupJobStatus when they start processing.
func (r *DriveRepository) GetQueuedBackupJobs(limit int) ([]models.BackupJob, error) {
	query := `
		SELECT id, postcard_id, idempotency_key, status, drive_file_id, retry_count, last_error, queued_at, processed_at, synced_at
		FROM backup_jobs
		WHERE status = 'queued'
		ORDER BY queued_at ASC
		LIMIT $1
	`

	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []models.BackupJob
	for rows.Next() {
		var job models.BackupJob
		var driveFileID, lastError sql.NullString
		var processedAt, syncedAt sql.NullTime

		err := rows.Scan(
			&job.ID, &job.PostcardID, &job.IdempotencyKey, &job.Status,
			&driveFileID, &job.RetryCount, &lastError,
			&job.QueuedAt, &processedAt, &syncedAt,
		)
		if err != nil {
			return nil, err
		}
		if driveFileID.Valid {
			job.DriveFileID = &driveFileID.String
		}
		if lastError.Valid {
			job.LastError = &lastError.String
		}
		if processedAt.Valid {
			job.ProcessedAt = &processedAt.Time
		}
		if syncedAt.Valid {
			job.SyncedAt = &syncedAt.Time
		}
		jobs = append(jobs, job)
	}

	return jobs, nil
}

// GetLastSyncTime returns the most recent synced_at timestamp for a user's Drive connection
func (r *DriveRepository) GetLastSyncTime(userID uuid.UUID) (*time.Time, error) {
	query := `
		SELECT MAX(bj.synced_at)
		FROM backup_jobs bj
		JOIN drive_connections dc ON dc.user_id = $1
		JOIN postcards p ON bj.postcard_id = p.id
		JOIN events e ON p.event_id = e.id
		WHERE e.owner_id = $1 AND bj.status = 'synced'
	`
	var lastSync sql.NullTime
	err := r.db.QueryRow(query, userID).Scan(&lastSync)
	if err != nil {
		return nil, err
	}
	if lastSync.Valid {
		return &lastSync.Time, nil
	}
	return nil, nil
}

// GetEventByPostcardID returns the event owner for a given postcard
func (r *DriveRepository) GetEventByPostcardID(postcardID uuid.UUID) (*models.Event, error) {
	query := `
		SELECT e.id, e.owner_id
		FROM events e
		JOIN postcards p ON p.event_id = e.id
		WHERE p.id = $1
	`
	var event models.Event
	err := r.db.QueryRow(query, postcardID).Scan(&event.ID, &event.OwnerID)
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// GetPostcardByID returns a postcard by ID
func (r *DriveRepository) GetPostcardByID(postcardID uuid.UUID) (*models.Postcard, error) {
	query := `
		SELECT id, event_id, image_path, media_type
		FROM postcards
		WHERE id = $1
	`
	var postcard models.Postcard
	err := r.db.QueryRow(query, postcardID).Scan(&postcard.ID, &postcard.EventID, &postcard.ImagePath, &postcard.MediaType)
	if err != nil {
		return nil, err
	}
	return &postcard, nil
}
