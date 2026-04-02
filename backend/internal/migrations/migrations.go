package migrations

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

const (
	defaultMaxAttempts = 20
	defaultRetryDelay  = 3 * time.Second
)

func Run(ctx context.Context, databaseURL string) error {
	migrationsPath, err := ResolvePath()
	if err != nil {
		return err
	}

	maxAttempts := readIntEnv("DB_WAIT_MAX_ATTEMPTS", defaultMaxAttempts)
	retryDelay := readDurationEnv("DB_WAIT_RETRY_DELAY", defaultRetryDelay)

	if err := waitForDatabase(ctx, databaseURL, maxAttempts, retryDelay); err != nil {
		return err
	}

	if err := apply(databaseURL, migrationsPath); err != nil {
		return err
	}

	log.Printf("Database migrations are up to date")
	return nil
}

func ResolvePath() (string, error) {
	if configuredPath := os.Getenv("MIGRATIONS_PATH"); configuredPath != "" {
		resolvedPath, err := filepath.Abs(configuredPath)
		if err != nil {
			return "", fmt.Errorf("resolve MIGRATIONS_PATH: %w", err)
		}
		if isDirectory(resolvedPath) {
			return resolvedPath, nil
		}
		return "", fmt.Errorf("migrations path does not exist: %s", resolvedPath)
	}

	for _, candidate := range []string{"./migrations", "backend/migrations", "/app/migrations"} {
		resolvedPath, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if isDirectory(resolvedPath) {
			return resolvedPath, nil
		}
	}

	return "", errors.New("could not resolve migrations path; set MIGRATIONS_PATH")
}

func waitForDatabase(ctx context.Context, databaseURL string, maxAttempts int, retryDelay time.Duration) error {
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if err := pingDatabase(ctx, databaseURL); err == nil {
			if attempt > 1 {
				log.Printf("Database became available on attempt %d/%d", attempt, maxAttempts)
			}
			return nil
		} else if attempt == maxAttempts {
			return fmt.Errorf("database not ready after %d attempts: %w", maxAttempts, err)
		} else {
			log.Printf("Database not ready (attempt %d/%d): %v", attempt, maxAttempts, err)
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(retryDelay):
		}
	}

	return errors.New("database wait loop exited unexpectedly")
}

func pingDatabase(ctx context.Context, databaseURL string) error {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return db.PingContext(pingCtx)
}

func apply(databaseURL, migrationsPath string) error {
	m, err := migrate.New("file://"+filepath.ToSlash(migrationsPath), databaseURL)
	if err != nil {
		return fmt.Errorf("create migrate instance: %w", err)
	}
	defer func() {
		sourceErr, databaseErr := m.Close()
		if sourceErr != nil {
			log.Printf("Failed closing migration source: %v", sourceErr)
		}
		if databaseErr != nil {
			log.Printf("Failed closing migration database handle: %v", databaseErr)
		}
	}()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return nil
		}
		return fmt.Errorf("apply migrations: %w", err)
	}

	return nil
}

func isDirectory(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

func readIntEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		log.Printf("Invalid %s=%q, using default %d", key, value, fallback)
		return fallback
	}

	return parsed
}

func readDurationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		log.Printf("Invalid %s=%q, using default %s", key, value, fallback)
		return fallback
	}

	return parsed
}
