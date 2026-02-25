-- Migration: 003_secret_box.sql
-- Agrega soporte para Secret Box: postcards secretas que se revelan con animación.
--
-- Para aplicar en un DB existente (sin recrear):
--   docker exec -i milegame-db psql -U user -d milegame < backend/migrations/003_secret_box.sql
--
-- Nota: IF NOT EXISTS / IF EXISTS garantizan idempotencia (se puede correr más de una vez)

-- 1. Hacer player_id nullable (postcards secretas no tienen jugador asociado)
ALTER TABLE postcards ALTER COLUMN player_id DROP NOT NULL;

-- 2. Nombre del remitente (sobreescribe el nombre del jugador en la UI)
--    Para secretas: siempre presente. Para regulares: opcional (préstamo de celular).
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

-- 3. Flag de secretas — FALSE = postal normal, TRUE = postal secreta (oculta hasta el reveal)
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Timestamp del momento en que se reveló la Secret Box (NULL = aún no revelada)
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMP;

-- 5. Índice para acelerar queries de admin (pocas filas, pero query frecuente durante la fiesta)
CREATE INDEX IF NOT EXISTS idx_postcards_is_secret ON postcards(is_secret) WHERE is_secret = TRUE;
