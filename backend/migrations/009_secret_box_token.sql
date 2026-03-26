-- Migration: 009_secret_box_token.sql
-- Agrega columna secret_box_token para gestionar acceso a Secret Box por evento.
-- Cada evento tiene su propio token, permitiendo aislar el acceso entre eventos.
--
-- Para aplicar en un DB existente:
--   docker exec -i milegame-db psql -U user -d milegame < backend/migrations/009_secret_box_token.sql
--
-- Nota: IF NOT EXISTS garantiza idempotencia

-- 1. Agregar columna secret_box_token (UUID, nullable, único)
ALTER TABLE events ADD COLUMN IF NOT EXISTS secret_box_token VARCHAR(36);

-- 2. Índice para búsquedas rápidas por token (queries de validación)
CREATE INDEX IF NOT EXISTS idx_events_secret_box_token ON events(secret_box_token) WHERE secret_box_token IS NOT NULL;
