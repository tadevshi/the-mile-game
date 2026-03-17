-- Migration: 005_seed_quiz_questions.sql
-- Seed quiz questions for the legacy event 'mile-2026'
-- 
-- This migration populates the quiz_questions table with all questions
-- from the hardcoded scorer.go for the legacy event.
--
-- IMPORTANT: This migration is IDEMPOTENT - uses ON CONFLICT DO NOTHING
-- to prevent duplicates if run multiple times.

-- ============================================
-- SEED QUIZ QUESTIONS FOR mile-2026 EVENT
-- ============================================

DO $$
DECLARE
    legacy_event_id UUID;
BEGIN
    -- Get the event ID for 'mile-2026'
    SELECT id INTO legacy_event_id FROM events WHERE slug = 'mile-2026';
    
    -- If event doesn't exist, raise notice (idempotent behavior)
    IF legacy_event_id IS NULL THEN
        RAISE NOTICE 'Event mile-2026 not found, skipping quiz questions seed';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding quiz questions for event: %', legacy_event_id;

    -- ============================================
    -- SECTION: FAVORITES (7 questions, scorable)
    -- ============================================

    -- singer: Cantante favorito
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'singer',
        '¿Cantante favorito?',
        '["ricardo arjona"]'::jsonb,
        NULL,
        1,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- flower: Flor favorita
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'flower',
        '¿Flor favorita?',
        '["girasol"]'::jsonb,
        NULL,
        2,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- drink: Bebida favorita
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'drink',
        '¿Cuál es mi bebida favorita?',
        '["te verde"]'::jsonb,
        NULL,
        3,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- disney: Película de Disney favorita
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'disney',
        '¿Película de Disney favorita?',
        '["bella y bestia"]'::jsonb,  -- "la bella y la bestia" normalizado (elimina artículos)
        NULL,
        4,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- season: Estación del año preferida
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'season',
        '¿Estación del año preferida?',
        '["primavera"]'::jsonb,
        NULL,
        5,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- color: Color favorito
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'color',
        '¿Cuál es mi color favorito?',
        '["rosado"]'::jsonb,
        NULL,
        6,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- dislike: Algo que no le guste
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'favorites',
        'dislike',
        '¿Menciona algo que no me guste?',
        '["aranas", "madrugar", "sol"]'::jsonb,  -- Multiple valid answers: "las arañas", "madrugar", "el sol"
        NULL,
        7,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- ============================================
    -- SECTION: PREFERENCES (6 questions, scorable)
    -- ============================================

    -- coffee: Café o Té?
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'preferences',
        'coffee',
        '¿Café o Té?',
        '["te"]'::jsonb,
        '["Café", "Té"]'::jsonb,
        1,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- place: Playa o Montaña?
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'preferences',
        'place',
        '¿Playa o Montaña?',
        '["playa"]'::jsonb,
        '["Playa", "Montaña"]'::jsonb,
        2,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- weather: Frío o Calor?
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'preferences',
        'weather',
        '¿Frío o Calor?',
        '["frio"]'::jsonb,  -- "frío" normalizado (elimina acento)
        '["Frío", "Calor"]'::jsonb,
        3,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- time: Día o Noche?
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'preferences',
        'time',
        '¿Día o Noche?',
        '["noche"]'::jsonb,
        '["Día", "Noche"]'::jsonb,
        4,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- food: Pizza o Sushi?
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'preferences',
        'food',
        '¿Pizza o Sushi?',
        '["sushi"]'::jsonb,
        '["Pizza", "Sushi"]'::jsonb,
        5,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- alcohol: Tequila o Vino?
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'preferences',
        'alcohol',
        '¿Tequila o Vino?',
        '["tequila"]'::jsonb,
        '["Tequila", "Vino"]'::jsonb,
        6,
        TRUE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- ============================================
    -- SECTION: DESCRIPTION (1 question, NOT scorable)
    -- ============================================

    -- describe_me: Descríbeme en una oración
    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (
        gen_random_uuid(),
        legacy_event_id,
        'description',
        'describe_me',
        '¿Descríbeme en una oración?',
        '[]'::jsonb,  -- No correct answers, not scorable
        NULL,
        1,
        FALSE
    )
    ON CONFLICT (event_id, key) DO NOTHING;

    -- ============================================
    -- VERIFICATION
    -- ============================================
    RAISE NOTICE 'Quiz questions seeded successfully for event mile-2026';
    RAISE NOTICE 'Total questions: 14 (7 favorites + 6 preferences + 1 description)';

END $$;

-- ============================================
-- NOTES
-- ============================================
--
-- All correct_answers are NORMALIZED according to scorer.go:
-- - Lowercase
-- - No accents (á→a, é→e, etc.)
-- - No punctuation
-- - Articles removed (el, la, los, las, un, una, etc.)
--
-- For preferences, options are stored as JSONB array
-- matching the frontend options in quiz.constants.ts
--
-- The dislike question accepts 3 valid answers:
-- - "aranas" (from "las arañas")
-- - "madrugar"
-- - "sol" (from "el sol")
--
-- To apply this migration manually:
--   docker exec -i milegame-db psql -U user -d milegame < backend/migrations/005_seed_quiz_questions.sql
--
-- Or rebuild the postgres container to trigger auto-migration:
--   docker-compose up -d --force-recreate postgres
