-- Migration: 004_multi_event.sql
-- Transforma la app de single-event a multi-event platform
-- 
-- Cambios principales:
-- 1. Nueva tabla users (organizadores de eventos)
-- 2. Nueva tabla events (entidad central)
-- 3. Nueva tabla quiz_questions (preguntas configurables por evento)
-- 4. Agrega event_id FK a tablas existentes
-- 5. Crea evento "legacy" para datos existentes y hace backfill

-- ============================================
-- 1. TABLA USERS (Organizadores)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 2. TABLA EVENTS (Entidad Central)
-- ============================================
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

-- ============================================
-- 3. TABLA QUIZ_QUESTIONS (Preguntas por Evento)
-- ============================================
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

-- ============================================
-- 4. AGREGAR event_id A TABLAS EXISTENTES
-- ============================================

-- Agregar event_id a players (nullable inicialmente para backfill)
ALTER TABLE players ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Agregar event_id a postcards (nullable inicialmente para backfill)
ALTER TABLE postcards ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- ============================================
-- 5. CREAR EVENTO LEGACY Y BACKFILL
-- ============================================

-- Crear un usuario admin por defecto para el legacy event
-- Password: 'admin123' (hasheado con bcrypt, cost 10)
INSERT INTO users (id, email, password_hash, name)
VALUES (
    gen_random_uuid(),
    'admin@mile-game.local',
    '$2a$10$WMj3pBxwFQQF0oPn9OLe8OMUp.qDohP3ONndvzxjLIw9ZmNwXlneu',
    'Admin Legacy'
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Crear evento legacy para datos existentes
-- Esto asegura que datos existentes no se pierdan
DO $$
DECLARE
    legacy_user_id UUID;
    legacy_event_id UUID;
BEGIN
    -- Obtener ID del usuario admin legacy
    SELECT id INTO legacy_user_id FROM users WHERE email = 'admin@mile-game.local';
    
    -- Solo continuar si encontramos el usuario
    IF legacy_user_id IS NOT NULL THEN
        -- Crear evento legacy
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
        
        -- Backfill: Asignar event_id a players existentes
        UPDATE players 
        SET event_id = legacy_event_id
        WHERE event_id IS NULL;
        
        -- Backfill: Asignar event_id a postcards existentes
        UPDATE postcards 
        SET event_id = legacy_event_id
        WHERE event_id IS NULL;
    END IF;
END $$;

-- ============================================
-- 6. HACER event_id NOT NULL (despues del backfill)
-- ============================================
-- NOTA: Descomentar estas lineas solo despues de verificar el backfill exitoso
-- ALTER TABLE players ALTER COLUMN event_id SET NOT NULL;
-- ALTER TABLE postcards ALTER COLUMN event_id SET NOT NULL;

-- ============================================
-- 7. INDICES ADICIONALES PARA QUERIES SCOPADAS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_players_event ON players(event_id);
CREATE INDEX IF NOT EXISTS idx_postcards_event ON postcards(event_id);

-- Indice compuesto para listar postcards por evento ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_postcards_event_created ON postcards(event_id, created_at DESC);

-- ============================================
-- 8. TABLA REFRESH_TOKENS (para auth JWT)
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Limpiar tokens expirados automaticamente (opcional, puede hacerse via cron)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW();

-- ============================================
-- NOTAS DE MIGRACION
-- ============================================
-- 
-- 1. El backfill asigna todos los datos existentes al evento 'mile-2026'
-- 2. El usuario admin legacy tiene email 'admin@mile-game.local'
-- 3. El password hash es un placeholder - actualizar con bcrypt real
-- 4. Las columnas event_id se dejan como nullable inicialmente
-- 5. Despues de verificar el backfill, hacerlas NOT NULL
--
-- Para generar hash bcrypt:
--   go run golang.org/x/crypto/bcrypt/cmd/bcrypt <password>
--
-- Para aplicar esta migracion:
--   docker exec -i milegame-db psql -U user -d milegame < backend/migrations/004_multi_event.sql
