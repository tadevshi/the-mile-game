ALTER TABLE events ADD COLUMN IF NOT EXISTS secret_box_token VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_events_secret_box_token ON events(secret_box_token) WHERE secret_box_token IS NOT NULL;
