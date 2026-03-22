-- Migration: 008_event_customization.sql
-- Agrega campos de personalización para eventos:
-- - logo_url: URL del logo/imagen representativa del evento
-- - background_url: URL del fondo custom para el corkboard
-- 
-- Estos campos se almacenan en settings (JSONB) para evitar agregar columnas.

-- Actualizar settings de eventos existentes para incluir los nuevos campos
-- Esto asegura que los eventos antiguos tengan las keys disponibles
UPDATE events
SET settings = jsonb_set(
    jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{logo_url}',
        '""'::jsonb
    ),
    '{background_url}',
    '""'::jsonb
)
WHERE settings IS NOT NULL
AND (
    settings->>'logo_url' IS NULL
    OR settings->>'background_url' IS NULL
);

-- Para eventos sin settings, crear con defaults
UPDATE events
SET settings = '{"logo_url": "", "background_url": ""}'::jsonb
WHERE settings IS NULL;

-- ============================================
-- NOTA: Los campos se almacenan en la columna JSONB 'settings'
-- Estructura esperada en settings:
-- {
--   "theme": "...",
--   "primary_color": "...",
--   "background_image": "...",
--   "logo_url": "/uploads/logos/event-slug-abc123.jpg",
--   "background_url": "/uploads/backgrounds/event-slug-def456.jpg"
-- }
-- ============================================

-- Índices para queries futuras si es necesario
-- CREATE INDEX IF NOT EXISTS idx_events_settings_logo ON events((settings->>'logo_url')) WHERE settings->>'logo_url' != '';
-- CREATE INDEX IF NOT EXISTS idx_events_settings_bg ON events((settings->>'background_url')) WHERE settings->>'background_url' != '';
