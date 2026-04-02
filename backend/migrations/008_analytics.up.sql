CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    page_path VARCHAR(255) NOT NULL,
    visited_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_event_id ON page_views(event_id);
CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON page_views(visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_event_visited ON page_views(event_id, visited_at);

CREATE TABLE IF NOT EXISTS quiz_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    score INTEGER,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_events_event_id ON quiz_events(event_id);
CREATE INDEX IF NOT EXISTS idx_quiz_events_player_id ON quiz_events(player_id);
CREATE INDEX IF NOT EXISTS idx_quiz_events_type ON quiz_events(event_type);
CREATE INDEX IF NOT EXISTS idx_quiz_events_created_at ON quiz_events(created_at);

CREATE TABLE IF NOT EXISTS postcard_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    postcard_id UUID REFERENCES postcards(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postcard_events_event_id ON postcard_events(event_id);
CREATE INDEX IF NOT EXISTS idx_postcard_events_created_at ON postcard_events(created_at);

CREATE OR REPLACE FUNCTION log_quiz_started(p_event_id UUID, p_player_id UUID)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO quiz_events (event_id, player_id, event_type)
    VALUES (p_event_id, p_player_id, 'started')
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_quiz_completed(p_event_id UUID, p_player_id UUID, p_score INTEGER, p_time_spent INTEGER)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO quiz_events (event_id, player_id, event_type, score, time_spent_seconds)
    VALUES (p_event_id, p_player_id, 'completed', p_score, p_time_spent)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
