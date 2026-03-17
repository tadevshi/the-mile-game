package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQuizQuestionRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	t.Run("success", func(t *testing.T) {
		question, err := repo.Create(
			eventID,
			"favorites",
			"favorite_color",
			"What's my favorite color?",
			[]string{"Pink"},
			nil,
			1,
			true,
		)

		require.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, question.ID)
		assert.Equal(t, eventID, question.EventID)
		assert.Equal(t, "favorites", question.Section)
		assert.Equal(t, "favorite_color", question.Key)
		assert.Equal(t, "What's my favorite color?", question.QuestionText)
		assert.Equal(t, []string{"Pink"}, question.CorrectAnswers)
		assert.Equal(t, 1, question.SortOrder)
		assert.True(t, question.IsScorable)
	})
}

func TestQuizQuestionRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create a question first
	created, err := repo.Create(
		eventID, "favorites", "test_key", "Test question?",
		[]string{"Answer"}, nil, 1, true,
	)
	require.NoError(t, err)

	t.Run("existing question", func(t *testing.T) {
		question, err := repo.GetByID(created.ID)
		require.NoError(t, err)
		assert.Equal(t, created.ID, question.ID)
		assert.Equal(t, "test_key", question.Key)
	})

	t.Run("not found", func(t *testing.T) {
		_, err := repo.GetByID(uuid.New())
		assert.Equal(t, ErrQuestionNotFound, err)
	})
}

func TestQuizQuestionRepository_ListByEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create multiple questions
	_, err := repo.Create(eventID, "favorites", "q1", "Q1?", []string{"A"}, nil, 1, true)
	require.NoError(t, err)
	_, err = repo.Create(eventID, "preferences", "q2", "Q2?", []string{"B"}, []string{"A", "B"}, 2, true)
	require.NoError(t, err)

	t.Run("returns all questions", func(t *testing.T) {
		questions, err := repo.ListByEvent(eventID)
		require.NoError(t, err)
		assert.Len(t, questions, 2)
	})

	t.Run("empty event", func(t *testing.T) {
		emptyEventIDStr := createTestEvent(t, db, "empty-event")
		emptyEventID := uuid.MustParse(emptyEventIDStr)
		questions, err := repo.ListByEvent(emptyEventID)
		require.NoError(t, err)
		assert.Len(t, questions, 0)
	})
}

func TestQuizQuestionRepository_ListByEventAndSection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create questions in different sections
	_, err := repo.Create(eventID, "favorites", "f1", "F1?", []string{"A"}, nil, 1, true)
	require.NoError(t, err)
	_, err = repo.Create(eventID, "favorites", "f2", "F2?", []string{"B"}, nil, 2, true)
	require.NoError(t, err)
	_, err = repo.Create(eventID, "preferences", "p1", "P1?", []string{"A"}, []string{"A", "B"}, 1, true)
	require.NoError(t, err)

	t.Run("filters by section", func(t *testing.T) {
		questions, err := repo.ListByEventAndSection(eventID, "favorites")
		require.NoError(t, err)
		assert.Len(t, questions, 2)
		for _, q := range questions {
			assert.Equal(t, "favorites", q.Section)
		}
	})

	t.Run("different section", func(t *testing.T) {
		questions, err := repo.ListByEventAndSection(eventID, "preferences")
		require.NoError(t, err)
		assert.Len(t, questions, 1)
		assert.Equal(t, "preferences", questions[0].Section)
	})
}

func TestQuizQuestionRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create a question
	created, err := repo.Create(
		eventID, "favorites", "original_key", "Original?",
		[]string{"Old"}, nil, 1, true,
	)
	require.NoError(t, err)

	t.Run("updates fields", func(t *testing.T) {
		created.QuestionText = "Updated question?"
		created.CorrectAnswers = []string{"New Answer"}
		created.SortOrder = 5

		err := repo.Update(created)
		require.NoError(t, err)

		// Verify update
		updated, err := repo.GetByID(created.ID)
		require.NoError(t, err)
		assert.Equal(t, "Updated question?", updated.QuestionText)
		assert.Equal(t, []string{"New Answer"}, updated.CorrectAnswers)
		assert.Equal(t, 5, updated.SortOrder)
	})
}

func TestQuizQuestionRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create and delete
	created, err := repo.Create(
		eventID, "favorites", "delete_me", "Delete me?",
		[]string{"Yes"}, nil, 1, true,
	)
	require.NoError(t, err)

	err = repo.Delete(created.ID)
	require.NoError(t, err)

	// Verify deletion
	_, err = repo.GetByID(created.ID)
	assert.Equal(t, ErrQuestionNotFound, err)
}

func TestQuizQuestionRepository_UpdateSortOrder(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create questions
	q1, err := repo.Create(eventID, "favorites", "q1", "Q1?", []string{"A"}, nil, 1, true)
	require.NoError(t, err)
	q2, err := repo.Create(eventID, "favorites", "q2", "Q2?", []string{"B"}, nil, 2, true)
	require.NoError(t, err)
	q3, err := repo.Create(eventID, "favorites", "q3", "Q3?", []string{"C"}, nil, 3, true)
	require.NoError(t, err)

	t.Run("updates sort orders", func(t *testing.T) {
		// Reorder: q3, q1, q2 (new order)
		updates := []SortOrderUpdate{
			{ID: q3.ID, SortOrder: 0},
			{ID: q1.ID, SortOrder: 1},
			{ID: q2.ID, SortOrder: 2},
		}

		err := repo.UpdateSortOrder(updates)
		require.NoError(t, err)

		// Verify new order
		questions, err := repo.ListByEventAndSection(eventID, "favorites")
		require.NoError(t, err)
		require.Len(t, questions, 3)

		// Should be sorted by sort_order
		assert.Equal(t, q3.ID, questions[0].ID)
		assert.Equal(t, 0, questions[0].SortOrder)
		assert.Equal(t, q1.ID, questions[1].ID)
		assert.Equal(t, 1, questions[1].SortOrder)
		assert.Equal(t, q2.ID, questions[2].ID)
		assert.Equal(t, 2, questions[2].SortOrder)
	})
}

func TestQuizQuestionRepository_CountByEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	t.Run("counts correctly", func(t *testing.T) {
		// Initially 0
		count, err := repo.CountByEvent(eventID)
		require.NoError(t, err)
		assert.Equal(t, 0, count)

		// Add 3 questions
		_, err = repo.Create(eventID, "favorites", "q1", "Q1?", []string{"A"}, nil, 1, true)
		require.NoError(t, err)
		_, err = repo.Create(eventID, "favorites", "q2", "Q2?", []string{"B"}, nil, 2, true)
		require.NoError(t, err)
		_, err = repo.Create(eventID, "preferences", "q3", "Q3?", []string{"C"}, []string{"A", "B"}, 1, true)
		require.NoError(t, err)

		count, err = repo.CountByEvent(eventID)
		require.NoError(t, err)
		assert.Equal(t, 3, count)
	})
}

func TestQuizQuestionRepository_KeyExists(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)

	repo := NewQuizQuestionRepository(db)
	eventIDStr := createTestEvent(t, db, "test-event")
	eventID := uuid.MustParse(eventIDStr)

	// Create a question
	_, err := repo.Create(
		eventID, "favorites", "existing_key", "Existing?",
		[]string{"Yes"}, nil, 1, true,
	)
	require.NoError(t, err)

	t.Run("existing key", func(t *testing.T) {
		exists, err := repo.KeyExists(eventID, "existing_key")
		require.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("non-existing key", func(t *testing.T) {
		exists, err := repo.KeyExists(eventID, "new_key")
		require.NoError(t, err)
		assert.False(t, exists)
	})
}
