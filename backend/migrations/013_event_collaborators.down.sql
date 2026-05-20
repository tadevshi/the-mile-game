DROP TABLE IF EXISTS event_collaborators;
DROP INDEX IF EXISTS idx_events_invite_token;
ALTER TABLE events DROP COLUMN IF EXISTS invite_token;
