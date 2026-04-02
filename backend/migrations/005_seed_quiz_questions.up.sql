DO $$
DECLARE
    legacy_event_id UUID;
BEGIN
    SELECT id INTO legacy_event_id FROM events WHERE slug = 'mile-2026';

    IF legacy_event_id IS NULL THEN
        RAISE NOTICE 'Event mile-2026 not found, skipping quiz questions seed';
        RETURN;
    END IF;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'singer', '¿Cantante favorito?', '["ricardo arjona"]'::jsonb, NULL, 1, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'flower', '¿Flor favorita?', '["girasol"]'::jsonb, NULL, 2, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'drink', '¿Cuál es mi bebida favorita?', '["te verde"]'::jsonb, NULL, 3, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'disney', '¿Película de Disney favorita?', '["bella y bestia"]'::jsonb, NULL, 4, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'season', '¿Estación del año preferida?', '["primavera"]'::jsonb, NULL, 5, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'color', '¿Cuál es mi color favorito?', '["rosado"]'::jsonb, NULL, 6, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'favorites', 'dislike', '¿Menciona algo que no me guste?', '["aranas", "madrugar", "sol"]'::jsonb, NULL, 7, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'preferences', 'coffee', '¿Café o Té?', '["te"]'::jsonb, '["Café", "Té"]'::jsonb, 1, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'preferences', 'place', '¿Playa o Montaña?', '["playa"]'::jsonb, '["Playa", "Montaña"]'::jsonb, 2, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'preferences', 'weather', '¿Frío o Calor?', '["frio"]'::jsonb, '["Frío", "Calor"]'::jsonb, 3, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'preferences', 'time', '¿Día o Noche?', '["noche"]'::jsonb, '["Día", "Noche"]'::jsonb, 4, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'preferences', 'food', '¿Pizza o Sushi?', '["sushi"]'::jsonb, '["Pizza", "Sushi"]'::jsonb, 5, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'preferences', 'alcohol', '¿Tequila o Vino?', '["tequila"]'::jsonb, '["Tequila", "Vino"]'::jsonb, 6, TRUE)
    ON CONFLICT (event_id, key) DO NOTHING;

    INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable)
    VALUES (gen_random_uuid(), legacy_event_id, 'description', 'describe_me', '¿Descríbeme en una oración?', '[]'::jsonb, NULL, 1, FALSE)
    ON CONFLICT (event_id, key) DO NOTHING;
END $$;
