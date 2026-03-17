# Database Migrations Guide

> How to run, create, and manage database migrations for The Mile Game.

## 🚀 Running Migrations

### Automatic (Docker)

When using Docker Compose, migrations run automatically on container startup:

```bash
docker-compose up -d
```

The backend container executes migrations in `/backend/cmd/api/main.go` on startup.

### Manual (Development)

To run migrations manually against your local database:

```bash
# Connect to PostgreSQL and run migration file
cat backend/migrations/006_themes.sql | docker exec -i $(docker ps --filter "name=milegame-db" --format "{{.ID}}") psql -U user -d milegame
```

Or with psql directly:

```bash
# If you have psql installed locally
export PGPASSWORD=password
psql -h localhost -U user -d milegame -f backend/migrations/006_themes.sql
```

## 📝 Creating New Migrations

### Naming Convention

Format: `XXX_descriptive_name.sql`

Examples:
- `006_themes.sql`
- `007_dynamic_flags.sql`
- `008_question_reorder.sql`

### Migration Template

```sql
-- Migration: XXX_feature_name.sql
-- Description: What this migration does

-- Up migration
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_name ON table_name(field);

-- Down migration (for rollback)
-- DROP TABLE IF EXISTS table_name;
```

### Best Practices

1. **Always include down migration** (commented out)
2. **Use IF EXISTS / IF NOT EXISTS** for safety
3. **Add indexes** for frequently queried fields
4. **Use transactions** for complex migrations
5. **Test migrations** on a copy of production data

## 📊 Current Migrations

| Version | File | Description | Status |
|---------|------|-------------|--------|
| 001 | `001_initial.sql` | Initial schema (players, quiz_answers) | ✅ Applied |
| 002 | `002_postcards.sql` | Postcards table for corkboard | ✅ Applied |
| 003 | `003_secret_box.sql` | Secret box postcards | ✅ Applied |
| 004 | `004_multi_event.sql` | Multi-event foundation | ✅ Applied |
| 005 | `005_seed_quiz_questions.sql` | Quiz questions seed | ✅ Applied |
| 006 | `006_themes.sql` | Theme customization | ✅ Applied |

## 🔄 Rollback Strategy

### Individual Migration

```bash
# Run down migration manually
psql -h localhost -U user -d milegame -c "DROP TABLE IF EXISTS themes;"
```

### Full Reset (⚠️ DESTRUCTIVE)

```bash
# Stop containers
docker-compose down

# Remove database volume
docker volume rm the-mile-game_milegame-data

# Restart (will recreate DB with all migrations)
docker-compose up -d
```

## 🧪 Testing Migrations

### Test Database

We use a separate test database for running tests:

```bash
# Test DB is configured automatically via docker-compose.test.yml
# Or set env vars:
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USER=user
export TEST_DB_PASSWORD=password
export TEST_DB_NAME=milegame_test

# Run tests
cd backend && go test ./...
```

### Verifying Applied Migrations

```bash
# Check applied migrations
docker exec milegame-db psql -U user -d milegame -c "\dt"

# Check specific table structure
docker exec milegame-db psql -U user -d milegame -c "\d themes"
```

## 🐛 Troubleshooting

### Migration Failed

```bash
# Check what failed
docker logs milegame-api

# Check database state
docker exec milegame-db psql -U user -d milegame -c "SELECT * FROM pg_tables WHERE tablename = 'your_table';"
```

### Manual Fix

If a migration fails partially:

1. Check what's already applied
2. Comment out already-applied parts in the migration file
3. Re-run the migration
4. Uncomment for future runs

## 📚 Related Docs

- [Backend Architecture](../AGENTS.md#backend)
- [API Documentation](api/README.md)
