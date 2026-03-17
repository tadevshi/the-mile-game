package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
)

// QuizQuestionAdminRepo define las operaciones de repositorio para admin de preguntas.
// Permite inyectar mocks en tests.
type QuizQuestionAdminRepo interface {
	Create(eventID uuid.UUID, section, key, questionText string, correctAnswers, options []string, sortOrder int, isScorable bool) (*models.QuizQuestion, error)
	GetByID(id uuid.UUID) (*models.QuizQuestion, error)
	ListByEvent(eventID uuid.UUID) ([]models.QuizQuestion, error)
	ListByEventAndSection(eventID uuid.UUID, section string) ([]models.QuizQuestion, error)
	Update(question *models.QuizQuestion) error
	Delete(id uuid.UUID) error
	UpdateSortOrder(updates []repository.SortOrderUpdate) error
	CountByEvent(eventID uuid.UUID) (int, error)
	KeyExists(eventID uuid.UUID, key string) (bool, error)
}

// EventFinder define la operación para obtener evento por slug.
type EventFinder interface {
	GetBySlug(slug string) (*models.Event, error)
}

// AdminQuestionHandler maneja las peticiones admin de preguntas del quiz
type AdminQuestionHandler struct {
	quizQuestionRepo QuizQuestionAdminRepo
	eventFinder      EventFinder
}

// NewAdminQuestionHandler crea un nuevo handler de admin de preguntas
func NewAdminQuestionHandler(quizQuestionRepo QuizQuestionAdminRepo, eventFinder EventFinder) *AdminQuestionHandler {
	return &AdminQuestionHandler{
		quizQuestionRepo: quizQuestionRepo,
		eventFinder:      eventFinder,
	}
}

// ListQuestions GET /api/admin/events/:slug/questions
// Query params: section (optional), page, per_page
func (h *AdminQuestionHandler) ListQuestions(c *gin.Context) {
	// Obtener evento por slug
	slug := c.Param("slug")
	event, err := h.eventFinder.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Obtener parámetros de paginación
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))
	section := c.Query("section")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}

	// Obtener preguntas
	var questions []models.QuizQuestion
	if section != "" {
		questions, err = h.quizQuestionRepo.ListByEventAndSection(event.ID, section)
	} else {
		questions, err = h.quizQuestionRepo.ListByEvent(event.ID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list questions"})
		return
	}

	// Si no hay preguntas, devolver array vacío
	if questions == nil {
		questions = []models.QuizQuestion{}
	}

	// Aplicar paginación
	total := len(questions)
	start := (page - 1) * perPage
	end := start + perPage
	if start > total {
		questions = []models.QuizQuestion{}
	} else {
		if end > total {
			end = total
		}
		questions = questions[start:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"questions": questions,
		"pagination": gin.H{
			"page":     page,
			"per_page": perPage,
			"total":    total,
		},
	})
}

// CreateQuestion POST /api/admin/events/:slug/questions
func (h *AdminQuestionHandler) CreateQuestion(c *gin.Context) {
	// Obtener evento por slug
	slug := c.Param("slug")
	event, err := h.eventFinder.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Parsear request
	var req models.CreateQuizQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validar que la key no exista ya para este evento
	exists, err := h.quizQuestionRepo.KeyExists(event.ID, req.Key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate key"})
		return
	}
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Question key already exists for this event"})
		return
	}

	// Si sort_order no se proporcionó, calcular el siguiente
	sortOrder := req.SortOrder
	if sortOrder == 0 {
		count, err := h.quizQuestionRepo.CountByEvent(event.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count questions"})
			return
		}
		sortOrder = count + 1
	}

	// Si is_scorable no se proporcionó,默认为true
	isScorable := req.IsScorable
	if !req.IsScorable && req.IsScorable { // Only false if explicitly set to false
		isScorable = false
	}
	// Por defecto es true
	if !req.IsScorable && len(req.CorrectAnswers) > 0 {
		isScorable = true
	}

	// Crear pregunta
	question, err := h.quizQuestionRepo.Create(
		event.ID,
		req.Section,
		req.Key,
		req.QuestionText,
		req.CorrectAnswers,
		req.Options,
		sortOrder,
		isScorable,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create question"})
		return
	}

	c.JSON(http.StatusCreated, question)
}

// UpdateQuestion PUT /api/admin/questions/:id
func (h *AdminQuestionHandler) UpdateQuestion(c *gin.Context) {
	// Parsear ID
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid question ID"})
		return
	}

	// Obtener pregunta existente
	question, err := h.quizQuestionRepo.GetByID(id)
	if err != nil {
		if err == repository.ErrQuestionNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get question"})
		return
	}

	// Parsear request
	var req struct {
		Section        *string  `json:"section,omitempty"`
		Key            *string  `json:"key,omitempty"`
		QuestionText   *string  `json:"question_text,omitempty"`
		CorrectAnswers []string `json:"correct_answers,omitempty"`
		Options        []string `json:"options,omitempty"`
		SortOrder      *int     `json:"sort_order,omitempty"`
		IsScorable     *bool    `json:"is_scorable,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validar key única si está cambiando
	if req.Key != nil && *req.Key != question.Key {
		exists, err := h.quizQuestionRepo.KeyExists(question.EventID, *req.Key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate key"})
			return
		}
		if exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Question key already exists for this event"})
			return
		}
		question.Key = *req.Key
	}

	// Aplicar updates
	if req.Section != nil {
		question.Section = *req.Section
	}
	if req.QuestionText != nil {
		question.QuestionText = *req.QuestionText
	}
	if req.CorrectAnswers != nil {
		question.CorrectAnswers = req.CorrectAnswers
	}
	if req.Options != nil {
		question.Options = req.Options
	}
	if req.SortOrder != nil {
		question.SortOrder = *req.SortOrder
	}
	if req.IsScorable != nil {
		question.IsScorable = *req.IsScorable
	}

	// Actualizar en DB
	if err := h.quizQuestionRepo.Update(question); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update question"})
		return
	}

	// Obtener pregunta actualizada
	updated, err := h.quizQuestionRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated question"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// DeleteQuestion DELETE /api/admin/questions/:id
func (h *AdminQuestionHandler) DeleteQuestion(c *gin.Context) {
	// Parsear ID
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid question ID"})
		return
	}

	// Verificar que existe
	_, err = h.quizQuestionRepo.GetByID(id)
	if err != nil {
		if err == repository.ErrQuestionNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get question"})
		return
	}

	// Eliminar
	if err := h.quizQuestionRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete question"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question deleted successfully"})
}

// ReorderQuestions PATCH /api/admin/events/:slug/questions/reorder
func (h *AdminQuestionHandler) ReorderQuestions(c *gin.Context) {
	// Obtener evento por slug
	slug := c.Param("slug")
	event, err := h.eventFinder.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Parsear request - usar estructura con tags JSON para snake_case
	var req []struct {
		ID        string `json:"id"`
		SortOrder int    `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if len(req) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No reorder updates provided"})
		return
	}

	// Convertir a SortOrderUpdate
	updates := make([]repository.SortOrderUpdate, len(req))
	for i, r := range req {
		id, err := uuid.Parse(r.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid question ID: " + r.ID})
			return
		}
		updates[i] = repository.SortOrderUpdate{ID: id, SortOrder: r.SortOrder}
	}

	// Validar que todos los IDs pertenezcan al evento
	for _, update := range updates {
		question, err := h.quizQuestionRepo.GetByID(update.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Question not found: " + update.ID.String()})
			return
		}
		if question.EventID != event.ID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Question does not belong to this event: " + update.ID.String()})
			return
		}
	}

	// Ejecutar reorder en transacción
	if err := h.quizQuestionRepo.UpdateSortOrder(updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder questions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Questions reordered successfully"})
}

// ExportQuestions GET /api/admin/events/:slug/questions/export
func (h *AdminQuestionHandler) ExportQuestions(c *gin.Context) {
	// Obtener evento por slug
	slug := c.Param("slug")
	event, err := h.eventFinder.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Obtener todas las preguntas
	questions, err := h.quizQuestionRepo.ListByEvent(event.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list questions"})
		return
	}

	// Si no hay preguntas, devolver array vacío
	if questions == nil {
		questions = []models.QuizQuestion{}
	}

	// Transformar a formato de exportación (sin IDs ni event_id)
	export := make([]map[string]interface{}, len(questions))
	for i, q := range questions {
		export[i] = map[string]interface{}{
			"section":         q.Section,
			"key":             q.Key,
			"question_text":   q.QuestionText,
			"correct_answers": q.CorrectAnswers,
			"options":         q.Options,
			"sort_order":      q.SortOrder,
			"is_scorable":     q.IsScorable,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"event":     event.Name,
		"questions": export,
	})
}

// ImportQuestions POST /api/admin/events/:slug/questions/import
func (h *AdminQuestionHandler) ImportQuestions(c *gin.Context) {
	// Obtener evento por slug
	slug := c.Param("slug")
	event, err := h.eventFinder.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Parsear request
	var req struct {
		Questions []struct {
			Section        string   `json:"section" binding:"required"`
			Key            string   `json:"key" binding:"required"`
			QuestionText   string   `json:"question_text" binding:"required"`
			CorrectAnswers []string `json:"correct_answers"`
			Options        []string `json:"options"`
			SortOrder      int      `json:"sort_order"`
			IsScorable     bool     `json:"is_scorable"`
		} `json:"questions" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.Questions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No questions to import"})
		return
	}

	// Validar cada pregunta y verificar keys únicas
	created := make([]models.QuizQuestion, 0, len(req.Questions))
	errors := make([]string, 0)

	for i, q := range req.Questions {
		// Validar required fields
		if q.Section == "" || q.Key == "" || q.QuestionText == "" {
			errors = append(errors, "Question "+strconv.Itoa(i+1)+": missing required fields")
			continue
		}

		// Validar que la key no exista
		exists, err := h.quizQuestionRepo.KeyExists(event.ID, q.Key)
		if err != nil {
			errors = append(errors, "Question "+strconv.Itoa(i+1)+": failed to validate key")
			continue
		}
		if exists {
			errors = append(errors, "Question "+strconv.Itoa(i+1)+": key '"+q.Key+"' already exists")
			continue
		}

		// Usar sort_order proporcionado o calcular
		sortOrder := q.SortOrder
		if sortOrder == 0 {
			count, err := h.quizQuestionRepo.CountByEvent(event.ID)
			if err != nil {
				errors = append(errors, "Question "+strconv.Itoa(i+1)+": failed to count questions")
				continue
			}
			sortOrder = count + 1
		}

		// Crear pregunta
		createdQuestion, err := h.quizQuestionRepo.Create(
			event.ID,
			q.Section,
			q.Key,
			q.QuestionText,
			q.CorrectAnswers,
			q.Options,
			sortOrder,
			q.IsScorable,
		)
		if err != nil {
			errors = append(errors, "Question "+strconv.Itoa(i+1)+": failed to create: "+err.Error())
			continue
		}

		created = append(created, *createdQuestion)
	}

	// Si hubo errores, devolver advertencia pero completar lo que se pudo
	if len(errors) > 0 && len(created) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "Failed to import any questions",
			"errors":   errors,
			"imported": 0,
		})
		return
	}

	response := gin.H{
		"imported":  len(created),
		"questions": created,
	}

	if len(errors) > 0 {
		response["warnings"] = errors
	}

	c.JSON(http.StatusCreated, response)
}
