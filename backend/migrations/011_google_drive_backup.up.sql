-- Migration: Google Drive Backup MVP
-- Creates tables for Drive OAuth connections and postcard backup jobs

-- Drive connections table (one per user)
CREATE TABLE IF NOT EXISTS drive_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drive_refresh_token_encrypted TEXT NOT NULL,
    drive_access_token TEXT NOT NULL DEFAULT '',
    token_expiry TIMESTAMP NOT NULL,
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_connections_user_id ON drive_connections(user_id);

-- Backup jobs table
CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postcard_id UUID NOT NULL REFERENCES postcards(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'synced', 'failed')),
    drive_file_id TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    queued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_postcard_id ON backup_jobs(postcard_id);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status) WHERE status IN ('queued', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_backup_jobs_idempotency_key ON backup_jobs(idempotency_key);

-- Add backup_status and backup_job_id to postcards table
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS backup_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (backup_status IN ('pending', 'queued', 'synced', 'failed'));
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_postcards_backup_status ON postcards(backup_status) WHERE backup_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_postcards_backup_job_id ON postcards(backup_job_id) WHERE backup_job_id IS NOT NULL;
