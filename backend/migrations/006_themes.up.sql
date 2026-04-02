CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    primary_color VARCHAR(7) NOT NULL DEFAULT '#EC4899',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#FBCFE8',
    accent_color VARCHAR(7) NOT NULL DEFAULT '#DB2777',
    bg_color VARCHAR(7) NOT NULL DEFAULT '#FFF5F7',
    text_color VARCHAR(7) NOT NULL DEFAULT '#1E293B',
    display_font VARCHAR(100) NOT NULL DEFAULT 'Great Vibes',
    heading_font VARCHAR(100) NOT NULL DEFAULT 'Playfair Display',
    body_font VARCHAR(100) NOT NULL DEFAULT 'Montserrat',
    logo_path VARCHAR(512),
    hero_image_path VARCHAR(512),
    background_style VARCHAR(50) NOT NULL DEFAULT 'watercolor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_themes_event_id ON themes(event_id);
