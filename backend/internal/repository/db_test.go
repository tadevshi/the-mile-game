package repository

import "testing"

func TestDatabaseURLUsesDatabaseURLEnv(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example:secret@db.internal:5432/eventhub?sslmode=require")

	if got := DatabaseURL(); got != "postgres://example:secret@db.internal:5432/eventhub?sslmode=require" {
		t.Fatalf("DatabaseURL() = %q", got)
	}
}

func TestDatabaseURLBuildsFromComponents(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DB_HOST", "postgres")
	t.Setenv("DB_PORT", "5433")
	t.Setenv("DB_USER", "eventhub")
	t.Setenv("DB_PASSWORD", "super-secret")
	t.Setenv("DB_NAME", "milegame")
	t.Setenv("DB_SSLMODE", "require")

	got := DatabaseURL()
	want := "postgres://eventhub:super-secret@postgres:5433/milegame?sslmode=require"
	if got != want {
		t.Fatalf("DatabaseURL() = %q, want %q", got, want)
	}
}
