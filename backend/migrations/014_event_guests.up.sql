-- Account-linked guests have no administrative role and do not replace quiz players.
CREATE TABLE event_guests (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

-- Separate lifecycle: never reuse collaborator or secret-box tokens.
CREATE TABLE event_guest_invites (
    event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE CHECK (token <> '')
);
