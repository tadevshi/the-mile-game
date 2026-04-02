package migrations

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestResolvePathUsesConfiguredDirectory(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("MIGRATIONS_PATH", tempDir)

	got, err := ResolvePath()
	if err != nil {
		t.Fatalf("ResolvePath() error = %v", err)
	}

	want, err := filepath.Abs(tempDir)
	if err != nil {
		t.Fatalf("filepath.Abs() error = %v", err)
	}

	if got != want {
		t.Fatalf("ResolvePath() = %q, want %q", got, want)
	}
}

func TestResolvePathErrorsWhenConfiguredDirectoryDoesNotExist(t *testing.T) {
	t.Setenv("MIGRATIONS_PATH", filepath.Join(t.TempDir(), "missing"))

	if _, err := ResolvePath(); err == nil {
		t.Fatal("ResolvePath() expected error for missing directory")
	}
}

func TestResolvePathFallsBackToLocalMigrationsDirectory(t *testing.T) {
	t.Setenv("MIGRATIONS_PATH", "")

	workingDir := t.TempDir()
	migrationsDir := filepath.Join(workingDir, "migrations")
	if err := os.Mkdir(migrationsDir, 0o755); err != nil {
		t.Fatalf("os.Mkdir() error = %v", err)
	}

	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("os.Getwd() error = %v", err)
	}
	defer func() {
		_ = os.Chdir(previousWD)
	}()

	if err := os.Chdir(workingDir); err != nil {
		t.Fatalf("os.Chdir() error = %v", err)
	}

	got, err := ResolvePath()
	if err != nil {
		t.Fatalf("ResolvePath() error = %v", err)
	}

	want, err := filepath.Abs(migrationsDir)
	if err != nil {
		t.Fatalf("filepath.Abs() error = %v", err)
	}

	if got != want {
		t.Fatalf("ResolvePath() = %q, want %q", got, want)
	}
}

func TestReadIntEnvFallsBackOnInvalidValue(t *testing.T) {
	t.Setenv("DB_WAIT_MAX_ATTEMPTS", "oops")

	if got := readIntEnv("DB_WAIT_MAX_ATTEMPTS", 7); got != 7 {
		t.Fatalf("readIntEnv() = %d, want 7", got)
	}
}

func TestReadDurationEnvFallsBackOnInvalidValue(t *testing.T) {
	t.Setenv("DB_WAIT_RETRY_DELAY", "not-a-duration")

	if got := readDurationEnv("DB_WAIT_RETRY_DELAY", 2*time.Second); got != 2*time.Second {
		t.Fatalf("readDurationEnv() = %s, want 2s", got)
	}
}
