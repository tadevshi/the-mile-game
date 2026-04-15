-- Rollback: Google Drive Backup MVP

-- Remove backup columns from postcards
ALTER TABLE postcards DROP COLUMN IF EXISTS backup_job_id;
ALTER TABLE postcards DROP COLUMN IF EXISTS backup_status;

-- Drop backup_jobs table
DROP TABLE IF EXISTS backup_jobs;

-- Drop drive_connections table
DROP TABLE IF EXISTS drive_connections;
