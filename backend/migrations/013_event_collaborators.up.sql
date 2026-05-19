ALTER TABLE events ADD COLUMN IF NOT EXISTS invite_token VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_invite_token ON events(invite_token) WHERE invite_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS event_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_collaborators_event ON event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_user ON event_collaborators(user_id);
