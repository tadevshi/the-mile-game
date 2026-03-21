-- Migration: 006_video_postcards.sql
-- Agrega soporte para video postcards: media_type, thumbnail_path, media_duration_ms.
--
-- Para aplicar en un DB existente:
--   docker exec -i milegame-db psql -U user -d milegame < backend/migrations/006_video_postcards.sql

-- 1. media_type: "image" | "video"
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'image';

-- 2. thumbnail_path: ruta al thumbnail generado por ffmpeg (solo para videos)
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(512);

-- 3. media_duration_ms: duración en milisegundos (solo para videos)
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS media_duration_ms INTEGER;

-- Índice para queries por media_type
CREATE INDEX IF NOT EXISTS idx_postcards_media_type ON postcards(media_type);

-- 4. Actualizar filas existentes (todas las postales actuales son imágenes)
UPDATE postcards SET media_type = 'image' WHERE media_type IS NULL OR media_type = '';
