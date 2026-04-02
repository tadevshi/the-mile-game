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

UPDATE events
SET settings = '{"logo_url": "", "background_url": ""}'::jsonb
WHERE settings IS NULL;
