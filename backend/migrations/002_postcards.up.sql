CREATE TABLE IF NOT EXISTS postcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    image_path VARCHAR(512) NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    rotation FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_postcards_created_at ON postcards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_postcards_player_id ON postcards(player_id);
