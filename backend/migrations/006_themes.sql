-- Migration: 006_themes.sql
-- Create themes table for event personalization

CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    
    -- Colors
    primary_color VARCHAR(7) NOT NULL DEFAULT '#EC4899',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#FBCFE8',
    accent_color VARCHAR(7) NOT NULL DEFAULT '#DB2777',
    bg_color VARCHAR(7) NOT NULL DEFAULT '#FFF5F7',
    text_color VARCHAR(7) NOT NULL DEFAULT '#1E293B',
    
    -- Typography
    display_font VARCHAR(100) NOT NULL DEFAULT 'Great Vibes',
    heading_font VARCHAR(100) NOT NULL DEFAULT 'Playfair Display',
    body_font VARCHAR(100) NOT NULL DEFAULT 'Montserrat',
    
    -- Branding assets
    logo_path VARCHAR(512),
    hero_image_path VARCHAR(512),
    
    -- Background style
    background_style VARCHAR(50) NOT NULL DEFAULT 'watercolor',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by event
CREATE INDEX idx_themes_event_id ON themes(event_id);

-- Down migration
-- DROP TABLE IF EXISTS themes;
