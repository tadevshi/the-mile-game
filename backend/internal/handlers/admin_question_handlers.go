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

// EventGetter define la operación para obtener evento por ID.
type EventGetter interface {
	GetByID(id uuid.UUID) (*models.Event, error)
}

// AdminQuestionHandler maneja las peticiones admin de preguntas del quiz
type AdminQuestionHandler struct {
	quizQuestionRepo QuizQuestionAdminRepo
	eventFinder      EventFinder
	eventGetter      EventGetter
}

// NewAdminQuestionHandler crea un nuevo handler de admin de preguntas
func NewAdminQuestionHandler(quizQuestionRepo QuizQuestionAdminRepo, eventFinder EventFinder, eventGetter EventGetter) *AdminQuestionHandler {
	return &AdminQuestionHandler{
		quizQuestionRepo: quizQuestionRepo,
		eventFinder:      eventFinder,
		eventGetter:      eventGetter,
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

	// Devolver array directamente
	c.JSON(http.StatusOK, questions)
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

	// Si is_scorable es nil, 默认true (tiene correct_answers)
	isScorable := true
	if req.IsScorable != nil {
		isScorable = *req.IsScorable
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

// checkOwnership verifica que el usuario autenticado sea owner del evento de la pregunta
func (h *AdminQuestionHandler) checkOwnership(question *models.QuizQuestion, c *gin.Context) bool {
	// Obtener user_id del contexto (seteado por AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return false
	}

	// Obtener evento
	event, err := h.eventGetter.GetByID(question.EventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event"})
		return false
	}

	currentUserID := userID.(uuid.UUID)

	// Verificar ownership
	if currentUserID != event.OwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized. You are not the owner of this event"})
		return false
	}

	return true
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

	// Verificar ownership
	if !h.checkOwnership(question, c) {
		return
	}

	// Parsear request
	var req models.UpdateQuizQuestionRequest
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

	// Obtener pregunta
	question, err := h.quizQuestionRepo.GetByID(id)
	if err != nil {
		if err == repository.ErrQuestionNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get question"})
		return
	}

	// Verificar ownership
	if !h.checkOwnership(question, c) {
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

	// Parsear request - aceptar estructura con orders
	var req models.ReorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if len(req.Orders) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No reorder updates provided"})
		return
	}

	// Convertir a SortOrderUpdate
	updates := make([]repository.SortOrderUpdate, len(req.Orders))
	for i, r := range req.Orders {
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

	// Devolver array directamente
	c.JSON(http.StatusOK, export)
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

	// Parsear request - aceptar array directamente (matching export format)
	var questions []models.CreateQuizQuestionRequest
	if err := c.ShouldBindJSON(&questions); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(questions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No questions to import"})
		return
	}

	// Validar cada pregunta y verificar keys únicas
	created := make([]models.QuizQuestion, 0, len(questions))
	errors := make([]string, 0)

	for i, q := range questions {
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

		// Resolver is_scorable (default true)
		isScorable := true
		if q.IsScorable != nil {
			isScorable = *q.IsScorable
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
			isScorable,
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
