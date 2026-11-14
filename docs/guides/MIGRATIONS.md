# Database Migrations Guide

This project now uses `golang-migrate` from inside the backend process.

## Startup Strategy

The backend runs migrations before creating repositories, handlers, or HTTP routes.

Behavior at startup:

1. Resolve the migrations directory.
2. Wait for PostgreSQL to accept connections.
3. Run `migrate.Up()` once.
4. Treat `ErrNoChange` as success.
5. Exit immediately if a real migration error occurs.

This replaces the old `docker-entrypoint-initdb.d` approach, which only worked when PostgreSQL booted with an empty volume.

## Migrations Directory

Runtime migrations live in `backend/migrations` and use `golang-migrate` naming:

```text
001_initial_schema.up.sql
001_initial_schema.down.sql
002_postcards.up.sql
002_postcards.down.sql
...
010_secret_box_token.up.sql
010_secret_box_token.down.sql
```

Important:

- The application only runs `up` migrations automatically.
- `down` migrations are not executed automatically. Inspect each file before applying one; rollback safety varies by migration, and some `down` files delete data.
- Production rollback should generally be handled with backup/restore or a forward fix migration.

## Environment Variables

Optional runtime knobs:

```env
MIGRATIONS_PATH=/app/migrations
DB_WAIT_MAX_ATTEMPTS=20
DB_WAIT_RETRY_DELAY=3s
```

Notes:

- `MIGRATIONS_PATH` defaults to the first existing path among `./migrations`, `backend/migrations`, and `/app/migrations`.
- `DATABASE_URL` is preferred.
- If `DATABASE_URL` is missing, the backend builds it from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and optional `DB_SSLMODE`.

## Local Development

Local Docker Compose stays compatible.

```bash
docker compose up -d
```

What changed:

- Postgres no longer mounts SQL files into `/docker-entrypoint-initdb.d`.
- The backend container owns schema migration on every startup.
- Reusing an existing Postgres volume is now safe because pending migrations still run.

If you run the API locally outside Docker, start it from `backend/` or set `MIGRATIONS_PATH` explicitly.

## Dokploy Deployment

Recommended Dokploy setup:

1. Deploy Postgres as a managed service or sidecar.
2. Deploy the backend container from `backend/Dockerfile`.
3. Set `DATABASE_URL` in Dokploy.
4. Optionally set `DB_WAIT_MAX_ATTEMPTS` and `DB_WAIT_RETRY_DELAY` if your database is slow to become ready.

The backend image already ships with `/app/migrations`, and the container sets:

```env
MIGRATIONS_PATH=/app/migrations
```

That means no separate migration job is required for standard deployments.

## Creating a New Migration

Create both files with the next numeric version:

```text
011_feature_name.up.sql
011_feature_name.down.sql
```

Guidelines:

1. Make the `up` migration idempotent when practical.
2. Prefer `IF EXISTS` / `IF NOT EXISTS` for additive changes.
3. Keep data backfills re-runnable.
4. If rollback is unsafe, keep the `down` file as a documented no-op and use a forward fix later.

Example:

```sql
-- 011_feature_name.up.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS hero_title TEXT;
```

```sql
-- 011_feature_name.down.sql
SELECT 1;
```

## Migration 014: Account-Linked Event Guests

`014_event_guests.up.sql` adds two tables:

- `event_guests` stores one membership per event and account, keyed by `(event_id, user_id)`. Both foreign keys cascade on deletion. `joined_at` records when the account joined, and an index on `user_id` supports listing an account's memberships.
- `event_guest_invitations` stores one reusable invitation token per event. The event ID is the primary key, the token is unique, and creation/update timestamps are recorded.

Guest memberships are separate from `event_collaborators`: accepting a guest invitation does not grant event-administration rights. Rotating the event invitation changes the link used for future acceptances; it does not remove existing guest memberships.

**Rollback warning:** `014_event_guests.down.sql` drops both tables. Applying it deletes all guest memberships and event invitation tokens. Do not apply it if those records must be preserved. Restoring deleted records requires a backup; a forward migration can recreate schema, but cannot recover dropped data.

## Validation

Useful checks:

```bash
docker compose logs backend
docker exec milegame-db psql -U user -d milegame -c "SELECT version, dirty FROM schema_migrations;"
docker exec milegame-db psql -U user -d milegame -c "\dt"
```

Expected runtime log behavior:

- If the DB is still booting: retry logs.
- If everything is current: startup continues normally.
- If a migration is broken: backend exits fast.

## Troubleshooting

### `migrations path does not exist`

Set `MIGRATIONS_PATH` explicitly for the environment.

### `database not ready after N attempts`

Increase:

```env
DB_WAIT_MAX_ATTEMPTS
DB_WAIT_RETRY_DELAY
```

### Dirty migration state

If `schema_migrations.dirty = true`, the previous migration failed partway through. Fix the SQL and repair the DB state before restarting the backend.

## Related Files

- `backend/cmd/api/main.go`
- `backend/internal/migrations/migrations.go`
- `backend/internal/repository/db.go`
- `backend/Dockerfile`
- `docker-compose.yml`
