package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

func TestRunAppliesMigrationsOnEmptyDatabase(t *testing.T) {
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
		"event_guests",
		"event_guest_invitations",
		"schema_migrations",
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

	if dirty {
		t.Fatal("schema_migrations.dirty = true, want false")
	}
}

func TestVisibilityMigrationDefaultsExistingEventsToPublic(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live PostgreSQL integration test in short mode")
	}

	adminDB, err := sql.Open("postgres", testDatabaseURL("postgres"))
	if err != nil {
		t.Fatalf("sql.Open(admin) error = %v", err)
	}
	defer adminDB.Close()
	if err := adminDB.Ping(); err != nil {
		t.Skipf("skipping live PostgreSQL integration test: %v", err)
	}

	databaseName := fmt.Sprintf("milegame_visibility_upgrade_%d", time.Now().UnixNano())
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
	legacyMigrationsPath := filepath.Join(t.TempDir(), "migrations-v14")
	if err := copyMigrationsThroughVersion(t, migrationsPath, legacyMigrationsPath, 14); err != nil {
		t.Fatalf("copy migrations through v14: %v", err)
	}
	t.Setenv("DB_WAIT_MAX_ATTEMPTS", "1")
	t.Setenv("DB_WAIT_RETRY_DELAY", "100ms")
	t.Setenv("MIGRATIONS_PATH", legacyMigrationsPath)

	targetURL := testDatabaseURL(databaseName)
	if err := Run(context.Background(), targetURL); err != nil {
		t.Fatalf("Run() through v14 error = %v", err)
	}
	targetDB, err := sql.Open("postgres", targetURL)
	if err != nil {
		t.Fatalf("sql.Open(target) error = %v", err)
	}
	ownerID := uuid.New()
	if _, err := targetDB.Exec(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`, ownerID, ownerID.String()+"@example.test", "unused", "Owner"); err != nil {
		targetDB.Close()
		t.Fatalf("insert owner error = %v", err)
	}
	eventID := uuid.New()
	if _, err := targetDB.Exec(`INSERT INTO events (id, slug, owner_id, name) VALUES ($1, $2, $3, $4)`, eventID, "pre-visibility-event", ownerID, "Existing event"); err != nil {
		targetDB.Close()
		t.Fatalf("insert existing event error = %v", err)
	}
	if err := targetDB.Close(); err != nil {
		t.Fatalf("close pre-migration database: %v", err)
	}

	t.Setenv("MIGRATIONS_PATH", migrationsPath)
	if err := Run(context.Background(), targetURL); err != nil {
		t.Fatalf("Run() visibility migration error = %v", err)
	}
	targetDB, err = sql.Open("postgres", targetURL)
	if err != nil {
		t.Fatalf("sql.Open(target after migration) error = %v", err)
	}
	defer targetDB.Close()

	var isPublic bool
	if err := targetDB.QueryRow(`SELECT is_public FROM events WHERE id = $1`, eventID).Scan(&isPublic); err != nil {
		t.Fatalf("read migrated visibility error = %v", err)
	}
	if !isPublic {
		t.Fatal("existing event visibility = private, want public after migration")
	}
}

func copyMigrationsThroughVersion(t *testing.T, source, destination string, maxVersion int) error {
	t.Helper()
	if err := os.MkdirAll(destination, 0o755); err != nil {
		return err
	}
	entries, err := os.ReadDir(source)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".sql") {
			continue
		}
		versionPart, _, ok := strings.Cut(name, "_")
		if !ok {
			continue
		}
		version, err := strconv.Atoi(versionPart)
		if err != nil || version > maxVersion {
			continue
		}
		contents, err := os.ReadFile(filepath.Join(source, name))
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(destination, name), contents, 0o644); err != nil {
			return err
		}
	}
	return nil
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
