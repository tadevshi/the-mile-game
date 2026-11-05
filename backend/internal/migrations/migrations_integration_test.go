package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/lib/pq"
)

func TestRunAppliesMigrationsOnEmptyDatabaseVisibility(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live PostgreSQL integration test in short mode")
	}

	adminURL := testDatabaseURL("postgres")
	adminDB, err := sql.Open("postgres", adminURL)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer adminDB.Close()

	if err := adminDB.Ping(); err != nil {
		t.Skipf("skipping live PostgreSQL integration test: %v", err)
	}

	databaseName := fmt.Sprintf("milegame_migrations_%d", time.Now().UnixNano())
	if _, err := adminDB.Exec(`CREATE DATABASE ` + pqQuoteIdentifier(databaseName)); err != nil {
		t.Fatalf("CREATE DATABASE error = %v", err)
	}
	t.Cleanup(func() {
		_, _ = adminDB.Exec(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, databaseName)
		_, _ = adminDB.Exec(`DROP DATABASE IF EXISTS ` + pqQuoteIdentifier(databaseName))
	})

	migrationsPath, err := filepath.Abs(filepath.Join("..", "..", "migrations"))
	if err != nil {
		t.Fatalf("filepath.Abs() error = %v", err)
	}

	t.Setenv("MIGRATIONS_PATH", migrationsPath)
	t.Setenv("DB_WAIT_MAX_ATTEMPTS", "1")
	t.Setenv("DB_WAIT_RETRY_DELAY", "100ms")

	targetURL := testDatabaseURL(databaseName)
	// Stop at the previous schema to verify the seeded legacy event is backfilled.
	previous, err := migrate.New("file://"+filepath.ToSlash(migrationsPath), targetURL)
	if err != nil {
		t.Fatal(err)
	}
	if err := previous.Migrate(14); err != nil {
		t.Fatal(err)
	}
	if sourceErr, dbErr := previous.Close(); sourceErr != nil || dbErr != nil {
		t.Fatalf("close previous migration: %v, %v", sourceErr, dbErr)
	}
	if err := Run(context.Background(), targetURL); err != nil {
		t.Fatalf("Run() first pass error = %v", err)
	}

	if err := Run(context.Background(), targetURL); err != nil {
		t.Fatalf("Run() second pass error = %v", err)
	}

	targetDB, err := sql.Open("postgres", targetURL)
	if err != nil {
		t.Fatalf("sql.Open(target) error = %v", err)
	}
	defer targetDB.Close()

	for _, tableName := range []string{
		"players",
		"quiz_answers",
		"postcards",
		"users",
		"events",
		"quiz_questions",
		"refresh_tokens",
		"themes",
		"page_views",
		"quiz_events",
		"postcard_events",
		"schema_migrations",
		"event_guests",
		"event_guest_invites",
	} {
		var exists bool
		if err := targetDB.QueryRow(`SELECT to_regclass('public.' || $1) IS NOT NULL`, tableName).Scan(&exists); err != nil {
			t.Fatalf("to_regclass(%s) error = %v", tableName, err)
		}
		if !exists {
			t.Fatalf("expected table %s to exist", tableName)
		}
	}

	var version int
	var dirty bool
	if err := targetDB.QueryRow(`SELECT version, dirty FROM schema_migrations`).Scan(&version, &dirty); err != nil {
		t.Fatalf("schema_migrations query error = %v", err)
	}

	if version != 15 {
		t.Fatalf("schema_migrations version = %d, want 15", version)
	}

	var visibility string
	if err := targetDB.QueryRow(`SELECT visibility FROM events WHERE slug = 'mile-2026'`).Scan(&visibility); err != nil {
		t.Fatal(err)
	}
	if visibility != "public" {
		t.Fatalf("legacy visibility = %q, want public", visibility)
	}
	for _, value := range []any{"friends", "", "PUBLIC", nil} {
		if _, err := targetDB.Exec(`UPDATE events SET visibility = $1 WHERE slug = 'mile-2026'`, value); err == nil {
			t.Errorf("storage accepted invalid visibility %v", value)
		}
	}
	if err := targetDB.QueryRow(`SELECT visibility FROM events WHERE slug = 'mile-2026'`).Scan(&visibility); err != nil || visibility != "public" {
		t.Fatalf("rejected storage write mutated visibility: %q, %v", visibility, err)
	}

	if dirty {
		t.Fatal("schema_migrations.dirty = true, want false")
	}
}

func testDatabaseURL(databaseName string) string {
	host := firstEnv("TEST_DB_HOST", "DB_HOST", "localhost")
	port := firstEnv("TEST_DB_PORT", "DB_PORT", "5432")
	user := firstEnv("TEST_DB_USER", "DB_USER", "user")
	password := firstEnv("TEST_DB_PASSWORD", "DB_PASSWORD", "password")
	sslMode := firstEnv("TEST_DB_SSLMODE", "DB_SSLMODE", "disable")

	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, password, host, port, databaseName, sslMode)
}

func firstEnv(keys ...string) string {
	last := len(keys) - 1
	for _, key := range keys[:last] {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return keys[last]
}

func pqQuoteIdentifier(identifier string) string {
	return `"` + identifier + `"`
}
