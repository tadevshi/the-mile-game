package worker

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

const (
	// MaxRetries is the maximum number of retry attempts for a failed job
	MaxRetries = 3

	// BaseBackoff is the base delay for exponential backoff
	BaseBackoff = 1 * time.Second

	// WorkerPollInterval is how often the worker checks for new jobs
	WorkerPollInterval = 5 * time.Second

	// WorkerNumWorkers is the default number of concurrent workers
	WorkerNumWorkers = 3
)

// DriveServiceInterface defines the interface for Drive service operations needed by the worker
type DriveServiceInterface interface {
	UploadFile(ctx context.Context, accessToken string, content []byte, mimeType, idempotencyKey string) (*services.UploadResult, error)
	RefreshToken(ctx context.Context, refreshToken string) (*services.TokenResponse, error)
	DecryptToken(ciphertext string) (string, error)
	IsTokenExpired(expiry time.Time) bool
}

// BackupWorker processes backup jobs from the queue
type BackupWorker struct {
	Config   *models.DriveBackupConfig
	repo     *repository.DriveRepository
	drive    DriveServiceInterface
	poolSize int
	jobQueue chan *models.BackupJob
	stopChan chan struct{}
	wg       sync.WaitGroup
	running  int32 // atomic
	mu       sync.Mutex
}

// NewBackupWorker creates a new backup worker
func NewBackupWorker(config *models.DriveBackupConfig, repo *repository.DriveRepository, drive DriveServiceInterface, poolSize int) *BackupWorker {
	if poolSize <= 0 {
		poolSize = WorkerNumWorkers
	}

	return &BackupWorker{
		Config:   config,
		repo:     repo,
		drive:    drive,
		poolSize: poolSize,
		jobQueue: make(chan *models.BackupJob, 100), // Buffered channel
		stopChan: make(chan struct{}),
	}
}

// Start begins processing jobs
func (w *BackupWorker) Start() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !atomic.CompareAndSwapInt32(&w.running, 0, 1) {
		// Already running
		return
	}

	log.Printf("[BackupWorker] Starting with %d workers", w.poolSize)

	// Start worker goroutines
	for i := 0; i < w.poolSize; i++ {
		w.wg.Add(1)
		go w.worker(i)
	}

	// Start job fetcher
	w.wg.Add(1)
	go w.jobFetcher()
}

// Stop gracefully stops the worker
func (w *BackupWorker) Stop() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !atomic.CompareAndSwapInt32(&w.running, 1, 0) {
		// Not running
		return
	}

	log.Printf("[BackupWorker] Stopping...")

	// Signal stop
	close(w.stopChan)

	// Wait for workers to finish
	w.wg.Wait()

	log.Printf("[BackupWorker] Stopped")
}

// isRunning returns whether the worker is running
func (w *BackupWorker) isRunning() bool {
	return atomic.LoadInt32(&w.running) == 1
}

// worker is the main worker goroutine that processes jobs from the queue
func (w *BackupWorker) worker(id int) {
	defer w.wg.Done()

	log.Printf("[BackupWorker:%d] Started", id)

	for {
		select {
		case job, ok := <-w.jobQueue:
			if !ok {
				log.Printf("[BackupWorker:%d] Queue closed, exiting", id)
				return
			}
			log.Printf("[BackupWorker:%d] Processing job %s", id, job.ID)
			if err := w.processJob(job); err != nil {
				log.Printf("[BackupWorker:%d] Job %s failed: %v", id, job.ID, err)
			} else {
				log.Printf("[BackupWorker:%d] Job %s completed", id, job.ID)
			}

		case <-w.stopChan:
			log.Printf("[BackupWorker:%d] Received stop signal, exiting", id)
			return
		}
	}
}

// jobFetcher periodically fetches queued jobs from the database
func (w *BackupWorker) jobFetcher() {
	defer w.wg.Done()

	log.Printf("[BackupWorker] Job fetcher started")

	ticker := time.NewTicker(WorkerPollInterval)
	defer ticker.Stop()

	// Fetch immediately on start
	w.fetchJobs()

	for {
		select {
		case <-ticker.C:
			w.fetchJobs()

		case <-w.stopChan:
			log.Printf("[BackupWorker] Job fetcher received stop signal, exiting")
			return
		}
	}
}

// fetchJobs fetches queued jobs from the database and enqueues them
func (w *BackupWorker) fetchJobs() {
	if !w.isRunning() {
		return
	}

	// Fail fast if dependencies are not initialized
	if w.repo == nil {
		log.Printf("[BackupWorker] Cannot fetch jobs: repository is nil")
		return
	}

	jobs, err := w.repo.GetQueuedBackupJobs(10)
	if err != nil {
		log.Printf("[BackupWorker] Error fetching jobs: %v", err)
		return
	}

	for _, job := range jobs {
		select {
		case w.jobQueue <- &job:
			log.Printf("[BackupWorker] Enqueued job %s", job.ID)
		default:
			log.Printf("[BackupWorker] Job queue full, skipping job %s", job.ID)
		}
	}
}

// EnqueueBackupJob adds a new backup job to the queue and returns the job ID
func (w *BackupWorker) EnqueueBackupJob(postcardID uuid.UUID, idempotencyKey string) (uuid.UUID, error) {
	job := &models.BackupJob{
		ID:             uuid.New(),
		PostcardID:     postcardID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0,
		QueuedAt:       time.Now(),
	}

	if err := w.repo.CreateBackupJob(job); err != nil {
		return uuid.Nil, fmt.Errorf("failed to create backup job: %w", err)
	}

	// If worker is running, enqueue immediately
	if w.isRunning() {
		select {
		case w.jobQueue <- job:
			log.Printf("[BackupWorker] Enqueued job %s immediately", job.ID)
		default:
			log.Printf("[BackupWorker] Job queue full, job %s will be picked up by fetcher", job.ID)
		}
	}

	return job.ID, nil
}

// EnqueueExistingJob adds an existing backup job to the queue (for retries).
// The job must already exist in the database with status 'queued'.
func (w *BackupWorker) EnqueueExistingJob(postcardID uuid.UUID, idempotencyKey string, jobID uuid.UUID) error {
	job := &models.BackupJob{
		ID:             jobID,
		PostcardID:     postcardID,
		IdempotencyKey: idempotencyKey,
		Status:         models.BackupJobStatusQueued,
		RetryCount:     0, // Will be incremented by worker if needed
		QueuedAt:       time.Now(),
	}

	// If worker is running, enqueue immediately
	if w.isRunning() {
		select {
		case w.jobQueue <- job:
			log.Printf("[BackupWorker] Enqueued existing job %s immediately", job.ID)
		default:
			log.Printf("[BackupWorker] Job queue full, existing job %s will be picked up by fetcher", job.ID)
		}
	}

	return nil
}

// processJob processes a single backup job with retries
func (w *BackupWorker) processJob(job *models.BackupJob) error {
	log.Printf("[BackupWorker] Processing job %s (attempt %d)", job.ID, job.RetryCount+1)

	// Update status to in_progress
	if err := w.repo.UpdateBackupJobStatus(job.ID, models.BackupJobStatusInProgress, nil, nil); err != nil {
		return fmt.Errorf("failed to update job status to in_progress: %w", err)
	}

	// Get the drive connection for this user
	// Note: We need to get the user from the postcard's event
	event, err := w.repo.GetEventByPostcardID(job.PostcardID)
	if err != nil {
		w.markJobFailed(job, fmt.Errorf("failed to get event for postcard: %w", err))
		return err
	}

	conn, err := w.repo.GetDriveConnectionByUserID(event.OwnerID)
	if err != nil {
		w.markJobFailed(job, fmt.Errorf("failed to get drive connection: %w", err))
		return err
	}

	// Decrypt the access token
	accessToken, err := w.drive.DecryptToken(conn.DriveAccessToken)
	if err != nil {
		w.markJobFailed(job, fmt.Errorf("failed to decrypt access token: %w", err))
		return err
	}

	// Check if token is expired and refresh if needed
	if w.drive.IsTokenExpired(conn.TokenExpiry) {
		refreshToken, err := w.drive.DecryptToken(conn.DriveRefreshTokenEnc)
		if err != nil {
			w.markJobFailed(job, fmt.Errorf("failed to decrypt refresh token: %w", err))
			return err
		}

		log.Printf("[BackupWorker] Refreshing expired token for job %s", job.ID)
		tokenResp, err := w.drive.RefreshToken(context.Background(), refreshToken)
		if err != nil {
			w.markJobFailed(job, fmt.Errorf("failed to refresh token: %w", err))
			return err
		}

		// Update stored tokens
		accessToken = tokenResp.AccessToken
		encryptedAccessToken, err := services.EncryptToken(accessToken)
		if err != nil {
			w.markJobFailed(job, fmt.Errorf("failed to encrypt new access token: %w", err))
			return err
		}

		// If Google returned a new refresh token (token rotation), persist it too
		if tokenResp.RefreshToken != "" {
			encryptedRefreshToken, err := services.EncryptToken(tokenResp.RefreshToken)
			if err != nil {
				w.markJobFailed(job, fmt.Errorf("failed to encrypt new refresh token: %w", err))
				return err
			}
			conn.DriveRefreshTokenEnc = encryptedRefreshToken
		}

		// Update connection in DB
		conn.DriveAccessToken = encryptedAccessToken
		conn.TokenExpiry = tokenResp.Expiry
		if err := w.repo.UpsertDriveConnection(conn); err != nil {
			log.Printf("[BackupWorker] Warning: failed to update connection after refresh: %v", err)
		}
	}

	// Get the postcard to find the media path
	postcard, err := w.repo.GetPostcardByID(job.PostcardID)
	if err != nil {
		w.markJobFailed(job, fmt.Errorf("failed to get postcard: %w", err))
		return err
	}

	// Read the media file
	content, err := readMediaFile(postcard.ImagePath)
	if err != nil {
		w.markJobFailed(job, fmt.Errorf("failed to read media file: %w", err))
		return err
	}

	// Map semantic media_type ("image"/"video") to actual MIME type
	// The postcard.MediaType stores "image" or "video", not MIME types like "image/jpeg"
	mimeType := mediaTypeToMimeType(postcard.MediaType)

	// Upload to Drive (content is []byte, binary-safe)
	result, err := w.drive.UploadFile(context.Background(), accessToken, content, mimeType, job.IdempotencyKey)
	if err != nil {
		// Retry logic
		if job.RetryCount < MaxRetries {
			log.Printf("[BackupWorker] Upload failed for job %s, retrying (attempt %d/%d): %v", job.ID, job.RetryCount+1, MaxRetries, err)

			// Increment retry count
			if retryErr := w.repo.IncrementRetryCount(job.ID); retryErr != nil {
				log.Printf("[BackupWorker] Warning: failed to increment retry count: %v", retryErr)
			}

			// Exponential backoff
			backoff := BaseBackoff * time.Duration(1<<job.RetryCount)
			time.Sleep(backoff)

			// Re-fetch job to get updated retry count and process again
			updatedJob, err := w.repo.GetBackupJobByPostcardID(job.PostcardID)
			if err != nil {
				w.markJobFailed(job, fmt.Errorf("failed to re-fetch job: %w", err))
				return err
			}
			return w.processJob(updatedJob)
		}

		w.markJobFailed(job, fmt.Errorf("upload failed after %d retries: %w", MaxRetries, err))
		return err
	}

	// Success - update job status
	driveFileID := result.DriveFileID
	if err := w.repo.UpdateBackupJobStatus(job.ID, models.BackupJobStatusSynced, &driveFileID, nil); err != nil {
		return fmt.Errorf("failed to update job status to synced: %w", err)
	}

	// Update postcard's backup_status to synced
	if updateErr := w.repo.UpdatePostcardBackupStatus(job.PostcardID, models.BackupStatusSynced); updateErr != nil {
		log.Printf("[BackupWorker] Warning: failed to update postcard %s backup status to synced: %v", job.PostcardID, updateErr)
	}

	log.Printf("[BackupWorker] Job %s completed successfully, drive file ID: %s", job.ID, driveFileID)
	return nil
}

// markJobFailed marks a job as failed with the given error
func (w *BackupWorker) markJobFailed(job *models.BackupJob, err error) {
	errMsg := err.Error()
	if updateErr := w.repo.UpdateBackupJobStatus(job.ID, models.BackupJobStatusFailed, nil, &errMsg); updateErr != nil {
		log.Printf("[BackupWorker] Warning: failed to mark job %s as failed: %v", job.ID, updateErr)
	}
	// Update postcard's backup_status to failed
	if updateErr := w.repo.UpdatePostcardBackupStatus(job.PostcardID, models.BackupStatusFailed); updateErr != nil {
		log.Printf("[BackupWorker] Warning: failed to update postcard %s backup status to failed: %v", job.PostcardID, updateErr)
	}
}

// mediaTypeToMimeType maps semantic media_type values ("image", "video") to actual MIME types
func mediaTypeToMimeType(mediaType string) string {
	switch mediaType {
	case "video":
		return "video/mp4"
	case "image":
		return "image/jpeg"
	default:
		return "application/octet-stream"
	}
}

// readMediaFile reads the content of a media file from local disk.
// For MVP, path is relative to the uploads directory (e.g., "/uploads/postcard.jpg").
// In production, this could be adapted for cloud storage (S3, GCS, etc.).
func readMediaFile(path string) ([]byte, error) {
	// Handle empty path
	if path == "" {
		return nil, fmt.Errorf("media file path is empty")
	}

	// For MVP, we assume path is relative to the uploads directory
	// The uploads base path should be configured; here we use a sensible default
	// If path is absolute, use it directly; if relative, prepend uploads dir
	uploadsBase := os.Getenv("UPLOADS_DIR")
	if uploadsBase == "" {
		uploadsBase = "./uploads"
	}

	var fullPath string
	if filepath.IsAbs(path) {
		fullPath = path
	} else {
		fullPath = filepath.Join(uploadsBase, path)
	}

	// Read the file
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read media file %s: %w", path, err)
	}

	return content, nil
}
