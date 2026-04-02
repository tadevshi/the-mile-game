ALTER TABLE postcards ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'image';
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(512);
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS media_duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_postcards_media_type ON postcards(media_type);

UPDATE postcards SET media_type = 'image' WHERE media_type IS NULL OR media_type = '';
