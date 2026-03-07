package repository

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// QuizQuestionRepository maneja las operaciones de base de datos para preguntas del quiz
type QuizQuestionRepository struct {
	db *sql.DB
}

// NewQuizQuestionRepository crea un nuevo repositorio de preguntas
func NewQuizQuestionRepository(db *sql.DB) *QuizQuestionRepository {
	return &QuizQuestionRepository{db: db}
}

// Create crea una nueva pregunta para un evento
func (r *QuizQuestionRepository) Create(eventID uuid.UUID, section, key, questionText string,
	correctAnswers, options []string, sortOrder int, isScorable bool) (*models.QuizQuestion, error) {

	question := &models.QuizQuestion{
		ID:             uuid.New(),
		EventID:        eventID,
		Section:        section,
		Key:            key,
		QuestionText:   questionText,
		CorrectAnswers: correctAnswers,
		Options:        options,
		SortOrder:      sortOrder,
		IsScorable:     isScorable,
		CreatedAt:      time.Now(),
	}

	// Serializar arrays a JSONB
	correctAnswersJSON, _ := json.Marshal(correctAnswers)
	optionsJSON, _ := json.Marshal(options)

	query := `
		INSERT INTO quiz_questions (id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(query,
		question.ID, question.EventID, question.Section, question.Key, question.QuestionText,
		correctAnswersJSON, optionsJSON, question.SortOrder, question.IsScorable, question.CreatedAt)

	if err != nil {
		return nil, err
	}

	return question, nil
}

// GetByID obtiene una pregunta por su ID
func (r *QuizQuestionRepository) GetByID(id uuid.UUID) (*models.QuizQuestion, error) {
	question := &models.QuizQuestion{}
	var correctAnswersJSON, optionsJSON []byte

	query := `
		SELECT id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable, created_at
		FROM quiz_questions
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&question.ID, &question.EventID, &question.Section, &question.Key, &question.QuestionText,
		&correctAnswersJSON, &optionsJSON, &question.SortOrder, &question.IsScorable, &question.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrQuestionNotFound
		}
		return nil, err
	}

	json.Unmarshal(correctAnswersJSON, &question.CorrectAnswers)
	json.Unmarshal(optionsJSON, &question.Options)

	return question, nil
}

// ListByEvent obtiene todas las preguntas de un evento ordenadas por sort_order
func (r *QuizQuestionRepository) ListByEvent(eventID uuid.UUID) ([]models.QuizQuestion, error) {
	query := `
		SELECT id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable, created_at
		FROM quiz_questions
		WHERE event_id = $1
		ORDER BY section, sort_order
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.QuizQuestion
	for rows.Next() {
		var question models.QuizQuestion
		var correctAnswersJSON, optionsJSON []byte

		err := rows.Scan(
			&question.ID, &question.EventID, &question.Section, &question.Key, &question.QuestionText,
			&correctAnswersJSON, &optionsJSON, &question.SortOrder, &question.IsScorable, &question.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(correctAnswersJSON, &question.CorrectAnswers)
		json.Unmarshal(optionsJSON, &question.Options)

		questions = append(questions, question)
	}

	return questions, nil
}

// ListByEventAndSection obtiene preguntas de un evento filtradas por sección
func (r *QuizQuestionRepository) ListByEventAndSection(eventID uuid.UUID, section string) ([]models.QuizQuestion, error) {
	query := `
		SELECT id, event_id, section, key, question_text, correct_answers, options, sort_order, is_scorable, created_at
		FROM quiz_questions
		WHERE event_id = $1 AND section = $2
		ORDER BY sort_order
	`

	rows, err := r.db.Query(query, eventID, section)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.QuizQuestion
	for rows.Next() {
		var question models.QuizQuestion
		var correctAnswersJSON, optionsJSON []byte

		err := rows.Scan(
			&question.ID, &question.EventID, &question.Section, &question.Key, &question.QuestionText,
			&correctAnswersJSON, &optionsJSON, &question.SortOrder, &question.IsScorable, &question.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(correctAnswersJSON, &question.CorrectAnswers)
		json.Unmarshal(optionsJSON, &question.Options)

		questions = append(questions, question)
	}

	return questions, nil
}

// Update actualiza una pregunta
func (r *QuizQuestionRepository) Update(question *models.QuizQuestion) error {
	correctAnswersJSON, _ := json.Marshal(question.CorrectAnswers)
	optionsJSON, _ := json.Marshal(question.Options)

	query := `
		UPDATE quiz_questions
		SET section = $1, key = $2, question_text = $3, correct_answers = $4, 
		    options = $5, sort_order = $6, is_scorable = $7
		WHERE id = $8
	`

	_, err := r.db.Exec(query,
		question.Section, question.Key, question.QuestionText,
		correctAnswersJSON, optionsJSON, question.SortOrder, question.IsScorable, question.ID)

	return err
}

// Delete elimina una pregunta
func (r *QuizQuestionRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM quiz_questions WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// DeleteByEvent elimina todas las preguntas de un evento (útil para recrear quiz)
func (r *QuizQuestionRepository) DeleteByEvent(eventID uuid.UUID) error {
	query := `DELETE FROM quiz_questions WHERE event_id = $1`
	_, err := r.db.Exec(query, eventID)
	return err
}

// ErrQuestionNotFound error cuando la pregunta no existe
var ErrQuestionNotFound = sql.ErrNoRows
