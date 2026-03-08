package repository

import (
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// setupTestDB crea una conexión a la base de datos de test
// Requiere que PostgreSQL esté corriendo (via docker-compose)
func setupTestDB(t *testing.T) *sql.DB {
	dbHost := getEnv("TEST_DB_HOST", "localhost")
	dbPort := getEnv("TEST_DB_PORT", "5432")
	dbUser := getEnv("TEST_DB_USER", "user")
	dbPass := getEnv("TEST_DB_PASSWORD", "password")
	dbName := getEnv("TEST_DB_NAME", "milegame_test")

	connStr := "host=" + dbHost + " port=" + dbPort + " user=" + dbUser + " password=" + dbPass + " dbname=" + dbName + " sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	if err := db.Ping(); err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	return db
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// cleanupTestData limpia los datos de test
func cleanupTestData(t *testing.T, db *sql.DB) {
	tables := []string{
		"quiz_questions",
		"quiz_answers",
		"postcards",
		"players",
		"events",
		"users",
	}

	for _, table := range tables {
		if _, err := db.Exec("DELETE FROM " + table); err != nil {
			t.Logf("Warning: failed to cleanup table %s: %v", table, err)
		}
	}
}

// createTestUser crea un usuario de prueba
func createTestUser(t *testing.T, db *sql.DB) *models.User {
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("testpassword123"), bcrypt.DefaultCost)

	user := &models.User{
		ID:           uuid.New(),
		Email:        "test_" + uuid.New().String()[:8] + "@example.com",
		PasswordHash: string(passwordHash),
		Name:         "Test User",
		CreatedAt:    time.Now(),
	}

	query := `INSERT INTO users (id, email, password_hash, name, created_at) VALUES ($1, $2, $3, $4, $5)`
	_, err := db.Exec(query, user.ID, user.Email, user.PasswordHash, user.Name, user.CreatedAt)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return user
}

// ========== TESTS PARA UserRepository ==========

func TestCreateUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewUserRepository(db)

	user, err := repo.Create("test@example.com", "password123", "Test User")
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if user.ID == uuid.Nil {
		t.Error("Expected user ID to be set")
	}

	if user.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", user.Email)
	}

	if user.Name != "Test User" {
		t.Errorf("Expected name 'Test User', got '%s'", user.Name)
	}
}

func TestCreateUserDuplicateEmail(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewUserRepository(db)

	// Crear primer usuario
	_, err := repo.Create("duplicate@example.com", "password123", "User 1")
	if err != nil {
		t.Fatalf("Failed to create first user: %v", err)
	}

	// Intentar crear segundo usuario con mismo email
	_, err = repo.Create("duplicate@example.com", "password456", "User 2")
	if err == nil {
		t.Error("Expected error for duplicate email, got nil")
	}
}

func TestGetUserByEmail(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewUserRepository(db)

	// Crear usuario
	created, _ := repo.Create("findme@example.com", "password123", "Find Me")

	// Buscar por email
	found, err := repo.GetByEmail("findme@example.com")
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if found.ID != created.ID {
		t.Error("Expected found user ID to match created user ID")
	}
}

func TestGetUserByEmailNotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewUserRepository(db)

	_, err := repo.GetByEmail("nonexistent@example.com")
	if err == nil {
		t.Error("Expected error for non-existent user, got nil")
	}
}

// ========== TESTS PARA EventRepository ==========

func TestCreateEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	repo := NewEventRepository(db)

	event, err := repo.Create(user.ID, "test-event", "Test Event", "Description",
		models.EventFeatures{Quiz: true, Corkboard: true},
		models.EventSettings{}, nil, nil)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if event.ID == uuid.Nil {
		t.Error("Expected event ID to be set")
	}

	if event.Slug != "test-event" {
		t.Errorf("Expected slug 'test-event', got '%s'", event.Slug)
	}

	if event.OwnerID != user.ID {
		t.Error("Expected event owner_id to match user ID")
	}

	if !event.Features.Quiz || !event.Features.Corkboard {
		t.Error("Expected features to be set correctly")
	}
}

func TestCreateEventDuplicateSlug(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	repo := NewEventRepository(db)

	// Crear primer evento
	_, err := repo.Create(user.ID, "duplicate-slug", "Event 1", "",
		models.EventFeatures{}, models.EventSettings{}, nil, nil)
	if err != nil {
		t.Fatalf("Failed to create first event: %v", err)
	}

	// Intentar crear segundo evento con mismo slug
	_, err = repo.Create(user.ID, "duplicate-slug", "Event 2", "",
		models.EventFeatures{}, models.EventSettings{}, nil, nil)
	if err == nil {
		t.Error("Expected error for duplicate slug, got nil")
	}
}

func TestGetEventBySlug(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	repo := NewEventRepository(db)

	// Crear evento
	created, _ := repo.Create(user.ID, "find-event", "Find Event", "",
		models.EventFeatures{}, models.EventSettings{}, nil, nil)

	// Buscar por slug
	found, err := repo.GetBySlug("find-event")
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if found.ID != created.ID {
		t.Error("Expected found event ID to match created event ID")
	}

	if found.Slug != "find-event" {
		t.Errorf("Expected slug 'find-event', got '%s'", found.Slug)
	}
}

func TestGetEventBySlugNotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewEventRepository(db)

	_, err := repo.GetBySlug("nonexistent-event")
	if err == nil {
		t.Error("Expected error for non-existent event, got nil")
	}
}

func TestListEventsByOwner(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user1 := createTestUser(t, db)
	user2 := createTestUser(t, db)
	repo := NewEventRepository(db)

	// Crear eventos para user1
	repo.Create(user1.ID, "event-1", "Event 1", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
	repo.Create(user1.ID, "event-2", "Event 2", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)

	// Crear evento para user2
	repo.Create(user2.ID, "event-3", "Event 3", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)

	// Listar eventos de user1
	events, err := repo.ListByOwner(user1.ID)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(events) != 2 {
		t.Errorf("Expected 2 events for user1, got %d", len(events))
	}
}

// ========== TESTS PARA QuizQuestionRepository ==========

func TestCreateQuizQuestion(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	eventRepo := NewEventRepository(db)
	questionRepo := NewQuizQuestionRepository(db)

	event, _ := eventRepo.Create(user.ID, "quiz-event", "Quiz Event", "",
		models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)

	question, err := questionRepo.Create(event.ID, "favorites", "singer", "¿Cantante favorito?",
		[]string{"Taylor Swift", "taylor"}, nil, 1, true)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if question.ID == uuid.Nil {
		t.Error("Expected question ID to be set")
	}

	if question.EventID != event.ID {
		t.Error("Expected question event_id to match event ID")
	}

	if question.Key != "singer" {
		t.Errorf("Expected key 'singer', got '%s'", question.Key)
	}
}

func TestListQuizQuestionsByEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	eventRepo := NewEventRepository(db)
	questionRepo := NewQuizQuestionRepository(db)

	event1, _ := eventRepo.Create(user.ID, "event-1", "Event 1", "",
		models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)
	event2, _ := eventRepo.Create(user.ID, "event-2", "Event 2", "",
		models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)

	// Crear preguntas para event1
	questionRepo.Create(event1.ID, "favorites", "singer", "¿Cantante?", []string{"Taylor"}, nil, 1, true)
	questionRepo.Create(event1.ID, "preferences", "coffee_or_tea", "¿Café o té?", []string{"Café"}, []string{"Café", "Té"}, 2, true)

	// Crear pregunta para event2
	questionRepo.Create(event2.ID, "favorites", "flower", "¿Flor?", []string{"Rosa"}, nil, 1, true)

	// Listar preguntas de event1
	questions, err := questionRepo.ListByEvent(event1.ID)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(questions) != 2 {
		t.Errorf("Expected 2 questions for event1, got %d", len(questions))
	}
}

func TestQuizQuestionsIsolation(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	eventRepo := NewEventRepository(db)
	questionRepo := NewQuizQuestionRepository(db)

	eventA, _ := eventRepo.Create(user.ID, "event-a", "Event A", "",
		models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)
	eventB, _ := eventRepo.Create(user.ID, "event-b", "Event B", "",
		models.EventFeatures{Quiz: true}, models.EventSettings{}, nil, nil)

	// Crear pregunta específica para eventA
	questionRepo.Create(eventA.ID, "favorites", "only-in-a", "¿Solo en A?", []string{"Sí"}, nil, 1, true)

	// Listar preguntas de eventB
	questions, _ := questionRepo.ListByEvent(eventB.ID)

	// Verificar que la pregunta de eventA no aparece en eventB
	for _, q := range questions {
		if q.Key == "only-in-a" {
			t.Error("Question from event A should not appear in event B")
		}
	}
}

// ========== TESTS PARA SCOPING (Players y Postcards por Evento) ==========

func TestListPlayersByEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	eventRepo := NewEventRepository(db)
	playerRepo := NewPlayerRepository(db)

	event1, _ := eventRepo.Create(user.ID, "event-1", "Event 1", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
	event2, _ := eventRepo.Create(user.ID, "event-2", "Event 2", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)

	// Crear players para event1
	playerRepo.CreateWithEvent(event1.ID, "Player 1", "👤")
	playerRepo.CreateWithEvent(event1.ID, "Player 2", "👤")

	// Crear player para event2
	playerRepo.CreateWithEvent(event2.ID, "Player 3", "👤")

	// Listar players de event1
	players, err := playerRepo.ListByEvent(event1.ID)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(players) != 2 {
		t.Errorf("Expected 2 players for event1, got %d", len(players))
	}
}

func TestListPostcardsByEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	user := createTestUser(t, db)
	eventRepo := NewEventRepository(db)
	playerRepo := NewPlayerRepository(db)
	postcardRepo := NewPostcardRepository(db, "")

	event1, _ := eventRepo.Create(user.ID, "event-1", "Event 1", "", models.EventFeatures{Corkboard: true}, models.EventSettings{}, nil, nil)
	event2, _ := eventRepo.Create(user.ID, "event-2", "Event 2", "", models.EventFeatures{Corkboard: true}, models.EventSettings{}, nil, nil)

	player1, _ := playerRepo.CreateWithEvent(event1.ID, "Player 1", "👤")
	player2, _ := playerRepo.CreateWithEvent(event2.ID, "Player 2", "👤")

	// Crear postcards
	postcardRepo.CreateWithEvent(event1.ID, &player1.ID, "/uploads/1.jpg", "Message 1", 0, nil)
	postcardRepo.CreateWithEvent(event2.ID, &player2.ID, "/uploads/2.jpg", "Message 2", 0, nil)

	// Listar postcards de event1
	postcards, err := postcardRepo.ListByEvent(event1.ID)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(postcards) != 1 {
		t.Errorf("Expected 1 postcard for event1, got %d", len(postcards))
	}
}

// ========== TEST DE MIGRACIÓN BACKFILL ==========

func TestMigrationBackfill(t *testing.T) {
	// Este test verifica que el backfill de datos existentes funciona correctamente
	// Nota: Este test asume que hay una migración que crea un "legacy event" para datos existentes

	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	// En un entorno real, este test verificaría que:
	// 1. Existe un evento "legacy" con slug "mile-2026"
	// 2. Los datos existentes (players, postcards) tienen event_id asignado
	// 3. Las queries scopadas por evento funcionan correctamente

	// Por ahora, este test es un placeholder que documenta el requisito
	t.Log("Migration backfill test: Verifies existing data is assigned to legacy event")
}
