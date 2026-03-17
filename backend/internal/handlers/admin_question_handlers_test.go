package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// ============== MOCKS ==============

type mockQuizQuestionRepo struct {
	questions      map[uuid.UUID]*models.QuizQuestion
	eventQuestions map[uuid.UUID][]models.QuizQuestion
	nextID         uuid.UUID
}

func newMockQuizQuestionRepo() *mockQuizQuestionRepo {
	return &mockQuizQuestionRepo{
		questions:      make(map[uuid.UUID]*models.QuizQuestion),
		eventQuestions: make(map[uuid.UUID][]models.QuizQuestion),
		nextID:         uuid.New(),
	}
}

func (m *mockQuizQuestionRepo) Create(eventID uuid.UUID, section, key, questionText string, correctAnswers, options []string, sortOrder int, isScorable bool) (*models.QuizQuestion, error) {
	q := &models.QuizQuestion{
		ID:             m.nextID,
		EventID:        eventID,
		Section:        section,
		Key:            key,
		QuestionText:   questionText,
		CorrectAnswers: correctAnswers,
		Options:        options,
		SortOrder:      sortOrder,
		IsScorable:     isScorable,
	}
	m.nextID = uuid.New()
	m.questions[q.ID] = q

	// Add to eventQuestions
	m.eventQuestions[eventID] = append(m.eventQuestions[eventID], *q)

	return q, nil
}

func (m *mockQuizQuestionRepo) GetByID(id uuid.UUID) (*models.QuizQuestion, error) {
	if q, ok := m.questions[id]; ok {
		return q, nil
	}
	return nil, repository.ErrQuestionNotFound
}

func (m *mockQuizQuestionRepo) ListByEvent(eventID uuid.UUID) ([]models.QuizQuestion, error) {
	if qs, ok := m.eventQuestions[eventID]; ok {
		result := make([]models.QuizQuestion, len(qs))
		copy(result, qs)
		return result, nil
	}
	return []models.QuizQuestion{}, nil
}

func (m *mockQuizQuestionRepo) ListByEventAndSection(eventID uuid.UUID, section string) ([]models.QuizQuestion, error) {
	var result []models.QuizQuestion
	for _, q := range m.eventQuestions[eventID] {
		if q.Section == section {
			result = append(result, q)
		}
	}
	if result == nil {
		return []models.QuizQuestion{}, nil
	}
	return result, nil
}

func (m *mockQuizQuestionRepo) Update(question *models.QuizQuestion) error {
	if _, ok := m.questions[question.ID]; !ok {
		return repository.ErrQuestionNotFound
	}
	m.questions[question.ID] = question

	// Update in eventQuestions
	for i, q := range m.eventQuestions[question.EventID] {
		if q.ID == question.ID {
			m.eventQuestions[question.EventID][i] = *question
			break
		}
	}

	return nil
}

func (m *mockQuizQuestionRepo) Delete(id uuid.UUID) error {
	if _, ok := m.questions[id]; !ok {
		return repository.ErrQuestionNotFound
	}
	q := m.questions[id]
	delete(m.questions, id)

	// Remove from eventQuestions
	qs := m.eventQuestions[q.EventID]
	for i, qq := range qs {
		if qq.ID == id {
			m.eventQuestions[q.EventID] = append(qs[:i], qs[i+1:]...)
			break
		}
	}

	return nil
}

func (m *mockQuizQuestionRepo) UpdateSortOrder(updates []repository.SortOrderUpdate) error {
	for _, u := range updates {
		if q, ok := m.questions[u.ID]; ok {
			q.SortOrder = u.SortOrder
			// Also update in eventQuestions
			for i, eq := range m.eventQuestions[q.EventID] {
				if eq.ID == q.ID {
					m.eventQuestions[q.EventID][i].SortOrder = u.SortOrder
					break
				}
			}
		}
	}
	return nil
}

func (m *mockQuizQuestionRepo) CountByEvent(eventID uuid.UUID) (int, error) {
	return len(m.eventQuestions[eventID]), nil
}

func (m *mockQuizQuestionRepo) KeyExists(eventID uuid.UUID, key string) (bool, error) {
	for _, q := range m.eventQuestions[eventID] {
		if q.Key == key {
			return true, nil
		}
	}
	return false, nil
}

type mockEventFinder struct {
	events map[string]*models.Event
}

type mockEventGetter struct {
	events map[uuid.UUID]*models.Event
}

func newMockEventGetter() *mockEventGetter {
	return &mockEventGetter{
		events: make(map[uuid.UUID]*models.Event),
	}
}

func (m *mockEventGetter) AddEvent(event *models.Event) {
	m.events[event.ID] = event
}

func (m *mockEventGetter) GetByID(id uuid.UUID) (*models.Event, error) {
	if e, ok := m.events[id]; ok {
		return e, nil
	}
	return nil, sql.ErrNoRows
}

func newMockEventFinder() *mockEventFinder {
	return &mockEventFinder{
		events: make(map[string]*models.Event),
	}
}

func (m *mockEventFinder) AddEvent(event *models.Event) {
	m.events[event.Slug] = event
}

func (m *mockEventFinder) GetBySlug(slug string) (*models.Event, error) {
	if e, ok := m.events[slug]; ok {
		return e, nil
	}
	return nil, sql.ErrNoRows
}

// ============== HELPERS ==============

func setupTestRouter(handler *AdminQuestionHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Routes
	r.GET("/api/admin/events/:slug/questions", handler.ListQuestions)
	r.POST("/api/admin/events/:slug/questions", handler.CreateQuestion)
	r.PUT("/api/admin/questions/:id", handler.UpdateQuestion)
	r.DELETE("/api/admin/questions/:id", handler.DeleteQuestion)
	r.PATCH("/api/admin/events/:slug/questions/reorder", handler.ReorderQuestions)
	r.GET("/api/admin/events/:slug/questions/export", handler.ExportQuestions)
	r.POST("/api/admin/events/:slug/questions/import", handler.ImportQuestions)

	return r
}

// setupTestRouterWithAuth creates a router with auth context for ownership tests
func setupTestRouterWithAuth(handler *AdminQuestionHandler, userID uuid.UUID) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Middleware to set user_id in context (simulating AuthMiddleware)
	r.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	})

	// Routes
	r.GET("/api/admin/events/:slug/questions", handler.ListQuestions)
	r.POST("/api/admin/events/:slug/questions", handler.CreateQuestion)
	r.PUT("/api/admin/questions/:id", handler.UpdateQuestion)
	r.DELETE("/api/admin/questions/:id", handler.DeleteQuestion)
	r.PATCH("/api/admin/events/:slug/questions/reorder", handler.ReorderQuestions)
	r.GET("/api/admin/events/:slug/questions/export", handler.ExportQuestions)
	r.POST("/api/admin/events/:slug/questions/import", handler.ImportQuestions)

	return r
}

func createTestEvent(slug, name string) *models.Event {
	return &models.Event{
		ID:          uuid.New(),
		Slug:        slug,
		Name:        name,
		Description: "Test event",
	}
}

// ============== TESTS ==============

func TestAdminQuestionHandler_ListQuestions(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	// Add some questions
	mockRepo.Create(event.ID, "favorites", "fav_color", "Favorite color?", []string{"Pink"}, nil, 1, true)
	mockRepo.Create(event.ID, "preferences", "coffee_or_tea", "Coffee or tea?", []string{"Coffee"}, []string{"Coffee", "Tea"}, 1, true)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouter(handler)

	t.Run("success with pagination", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/admin/events/test-event/questions?page=1&per_page=10", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Now returns array directly
		var questions []interface{}
		err := json.Unmarshal(w.Body.Bytes(), &questions)
		require.NoError(t, err)

		assert.Len(t, questions, 2)
	})

	t.Run("success with section filter", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/admin/events/test-event/questions?section=favorites", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var questions []interface{}
		err := json.Unmarshal(w.Body.Bytes(), &questions)
		require.NoError(t, err)

		assert.Len(t, questions, 1)
	})

	t.Run("event not found", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/admin/events/nonexistent/questions", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestAdminQuestionHandler_CreateQuestion(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouter(handler)

	t.Run("success", func(t *testing.T) {
		body := `{
			"section": "favorites",
			"key": "new_question",
			"question_text": "New question?",
			"correct_answers": ["Answer"],
			"sort_order": 1,
			"is_scorable": true
		}`

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var question models.QuizQuestion
		err := json.Unmarshal(w.Body.Bytes(), &question)
		require.NoError(t, err)

		assert.Equal(t, "new_question", question.Key)
		assert.Equal(t, "New question?", question.QuestionText)
	})

	t.Run("duplicate key", func(t *testing.T) {
		// Create first question
		mockRepo.Create(event.ID, "favorites", "existing_key", "Existing?", []string{"A"}, nil, 1, true)

		body := `{
			"section": "favorites",
			"key": "existing_key",
			"question_text": "Duplicate?",
			"correct_answers": ["B"]
		}`

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("invalid request", func(t *testing.T) {
		body := `{"section": "favorites"}` // Missing key and question_text

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("event not found", func(t *testing.T) {
		body := `{"section": "favorites", "key": "q", "question_text": "Q?"}`

		req, _ := http.NewRequest("POST", "/api/admin/events/nonexistent/questions", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestAdminQuestionHandler_UpdateQuestion(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	event.OwnerID = uuid.MustParse("00000000-0000-0000-0000-000000000001") // Set owner
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	question, _ := mockRepo.Create(event.ID, "favorites", "original_key", "Original?", []string{"Old"}, nil, 1, true)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouterWithAuth(handler, event.OwnerID)

	t.Run("success", func(t *testing.T) {
		body := `{
			"question_text": "Updated question?",
			"correct_answers": ["New Answer"]
		}`

		req, _ := http.NewRequest("PUT", "/api/admin/questions/"+question.ID.String(), bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var updated models.QuizQuestion
		err := json.Unmarshal(w.Body.Bytes(), &updated)
		require.NoError(t, err)

		assert.Equal(t, "Updated question?", updated.QuestionText)
		assert.Equal(t, []string{"New Answer"}, updated.CorrectAnswers)
	})

	t.Run("duplicate key on update", func(t *testing.T) {
		// Create another question
		mockRepo.Create(event.ID, "favorites", "other_key", "Other?", []string{"X"}, nil, 2, true)

		body := `{"key": "other_key"}` // Try to change to existing key

		req, _ := http.NewRequest("PUT", "/api/admin/questions/"+question.ID.String(), bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("not found", func(t *testing.T) {
		body := `{"question_text": "Not exist?"}`

		req, _ := http.NewRequest("PUT", "/api/admin/questions/"+uuid.New().String(), bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("invalid id", func(t *testing.T) {
		req, _ := http.NewRequest("PUT", "/api/admin/questions/invalid-id", bytes.NewBufferString("{}"))
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("forbidden - wrong owner", func(t *testing.T) {
		// Create router with different user
		routerWrongOwner := setupTestRouterWithAuth(handler, uuid.MustParse("99999999-9999-9999-9999-999999999999"))

		body := `{"question_text": "Hacked?"}`

		req, _ := http.NewRequest("PUT", "/api/admin/questions/"+question.ID.String(), bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		routerWrongOwner.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestAdminQuestionHandler_DeleteQuestion(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	event.OwnerID = uuid.MustParse("00000000-0000-0000-0000-000000000001") // Set owner
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	question, _ := mockRepo.Create(event.ID, "favorites", "to_delete", "To delete?", []string{"A"}, nil, 1, true)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouterWithAuth(handler, event.OwnerID)

	t.Run("success", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/admin/questions/"+question.ID.String(), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify deleted
		_, err := mockRepo.GetByID(question.ID)
		assert.Equal(t, repository.ErrQuestionNotFound, err)
	})

	t.Run("not found", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/admin/questions/"+uuid.New().String(), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("invalid id", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/admin/questions/invalid-id", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("forbidden - wrong owner", func(t *testing.T) {
		// Create a new question for this test (since previous test deleted the other one)
		question2, _ := mockRepo.Create(event.ID, "favorites", "to_delete_2", "To delete 2?", []string{"B"}, nil, 2, true)

		// Create router with different user
		routerWrongOwner := setupTestRouterWithAuth(handler, uuid.MustParse("99999999-9999-9999-9999-999999999999"))

		req, _ := http.NewRequest("DELETE", "/api/admin/questions/"+question2.ID.String(), nil)
		w := httptest.NewRecorder()
		routerWrongOwner.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestAdminQuestionHandler_ReorderQuestions(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	q1, _ := mockRepo.Create(event.ID, "favorites", "q1", "Q1?", []string{"A"}, nil, 1, true)
	q2, _ := mockRepo.Create(event.ID, "favorites", "q2", "Q2?", []string{"B"}, nil, 2, true)
	q3, _ := mockRepo.Create(event.ID, "favorites", "q3", "Q3?", []string{"C"}, nil, 3, true)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouter(handler)

	t.Run("success", func(t *testing.T) {
		// Now uses { orders: [...] } structure
		body := `{"orders": [{"id": "` + q3.ID.String() + `", "sort_order": 1}, {"id": "` + q1.ID.String() + `", "sort_order": 2}, {"id": "` + q2.ID.String() + `", "sort_order": 3}]}`

		req, _ := http.NewRequest("PATCH", "/api/admin/events/test-event/questions/reorder", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify reorder
		q1Updated, _ := mockRepo.GetByID(q1.ID)
		assert.Equal(t, 2, q1Updated.SortOrder)

		q3Updated, _ := mockRepo.GetByID(q3.ID)
		assert.Equal(t, 1, q3Updated.SortOrder)
	})

	t.Run("question not in event", func(t *testing.T) {
		otherEvent := createTestEvent("other-event", "Other Event")
		mockEventFinder.AddEvent(otherEvent)
		mockEventGetter.AddEvent(otherEvent)
		otherQ, _ := mockRepo.Create(otherEvent.ID, "favorites", "other", "Other?", []string{"A"}, nil, 1, true)

		body := `{"orders": [{"id": "` + otherQ.ID.String() + `", "sort_order": 1}]}`

		req, _ := http.NewRequest("PATCH", "/api/admin/events/test-event/questions/reorder", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("empty array", func(t *testing.T) {
		body := `{"orders": []}`

		req, _ := http.NewRequest("PATCH", "/api/admin/events/test-event/questions/reorder", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestAdminQuestionHandler_ExportQuestions(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	mockRepo.Create(event.ID, "favorites", "fav_color", "Favorite color?", []string{"Pink"}, nil, 1, true)
	mockRepo.Create(event.ID, "preferences", "coffee_or_tea", "Coffee or tea?", []string{"Coffee"}, []string{"Coffee", "Tea"}, 1, true)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouter(handler)

	t.Run("success", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/admin/events/test-event/questions/export", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Now returns array directly
		var questions []interface{}
		err := json.Unmarshal(w.Body.Bytes(), &questions)
		require.NoError(t, err)

		assert.Len(t, questions, 2)
	})

	t.Run("empty event", func(t *testing.T) {
		emptyEvent := createTestEvent("empty-event", "Empty Event")
		mockEventFinder.AddEvent(emptyEvent)
		mockEventGetter.AddEvent(emptyEvent)

		req, _ := http.NewRequest("GET", "/api/admin/events/empty-event/questions/export", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var questions []interface{}
		err := json.Unmarshal(w.Body.Bytes(), &questions)
		require.NoError(t, err)

		assert.Len(t, questions, 0)
	})
}

func TestAdminQuestionHandler_ImportQuestions(t *testing.T) {
	mockRepo := newMockQuizQuestionRepo()
	mockEventFinder := newMockEventFinder()
	mockEventGetter := newMockEventGetter()

	event := createTestEvent("test-event", "Test Event")
	mockEventFinder.AddEvent(event)
	mockEventGetter.AddEvent(event)

	handler := NewAdminQuestionHandler(mockRepo, mockEventFinder, mockEventGetter)
	router := setupTestRouter(handler)

	t.Run("success", func(t *testing.T) {
		// Now accepts array directly
		body := `[
			{
				"section": "favorites",
				"key": "imported_1",
				"question_text": "Imported question 1?",
				"correct_answers": ["Answer 1"],
				"sort_order": 1,
				"is_scorable": true
			},
			{
				"section": "preferences",
				"key": "imported_2",
				"question_text": "Imported question 2?",
				"correct_answers": ["B"],
				"options": ["A", "B"],
				"sort_order": 2,
				"is_scorable": true
			}
		]`

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions/import", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, float64(2), response["imported"])
	})

	t.Run("duplicate keys in import", func(t *testing.T) {
		body := `[
			{"section": "favorites", "key": "dup_1", "question_text": "Q1?", "correct_answers": ["A"]},
			{"section": "favorites", "key": "dup_1", "question_text": "Q2?", "correct_answers": ["B"]}
		]`

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions/import", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Should import first, fail on second (duplicate within import)
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// At least first should succeed
		imported := response["imported"].(float64)
		assert.GreaterOrEqual(t, int(imported), 1)
	})

	t.Run("invalid json", func(t *testing.T) {
		body := `"not an array"`

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions/import", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("empty questions", func(t *testing.T) {
		body := `[]`

		req, _ := http.NewRequest("POST", "/api/admin/events/test-event/questions/import", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("event not found", func(t *testing.T) {
		body := `[{"section": "favorites", "key": "q", "question_text": "Q?"}]`

		req, _ := http.NewRequest("POST", "/api/admin/events/nonexistent/questions/import", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}
