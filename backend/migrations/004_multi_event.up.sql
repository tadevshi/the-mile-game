CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    features JSONB NOT NULL DEFAULT '{"quiz": true, "corkboard": true, "secret_box": false}',
    settings JSONB NOT NULL DEFAULT '{}',
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_owner ON events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    correct_answers JSONB NOT NULL DEFAULT '[]',
    options JSONB,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_scorable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, key)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_event ON quiz_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_section ON quiz_questions(event_id, section);

ALTER TABLE players ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

INSERT INTO users (id, email, password_hash, name)
VALUES (
    gen_random_uuid(),
    'admin@mile-game.local',
    '$2a$10$WMj3pBxwFQQF0oPn9OLe8OMUp.qDohP3ONndvzxjLIw9ZmNwXlneu',
    'Admin Legacy'
)
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
    legacy_user_id UUID;
    legacy_event_id UUID;
BEGIN
    SELECT id INTO legacy_user_id FROM users WHERE email = 'admin@mile-game.local';

    IF legacy_user_id IS NOT NULL THEN
        INSERT INTO events (id, slug, owner_id, name, description, features, settings, is_active)
        VALUES (
            gen_random_uuid(),
            'mile-2026',
            legacy_user_id,
            'Cumpleaños de Mile 2026',
            'Evento legacy - datos existentes',
            '{"quiz": true, "corkboard": true, "secret_box": true}'::jsonb,
            '{}'::jsonb,
            TRUE
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO legacy_event_id;

        IF legacy_event_id IS NULL THEN
            SELECT id INTO legacy_event_id FROM events WHERE slug = 'mile-2026';
        END IF;

        UPDATE players
        SET event_id = legacy_event_id
        WHERE event_id IS NULL AND legacy_event_id IS NOT NULL;

        UPDATE postcards
        SET event_id = legacy_event_id
        WHERE event_id IS NULL AND legacy_event_id IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_players_event ON players(event_id);
CREATE INDEX IF NOT EXISTS idx_postcards_event ON postcards(event_id);
CREATE INDEX IF NOT EXISTS idx_postcards_event_created ON postcards(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
