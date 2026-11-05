-- Existing events and callers that omit visibility retain public behavior.
ALTER TABLE events
    ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
    CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'private'));
