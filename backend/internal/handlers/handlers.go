package handlers

import (
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
	"github.com/the-mile-game/backend/internal/websocket"
)

// PostcardRepo define las operaciones de repositorio usadas por los handlers.
// Permite inyectar mocks en tests sin necesidad de una base de datos real.
type PostcardRepo interface {
	Create(playerID uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error)
	CreateWithEvent(eventID uuid.UUID, playerID *uuid.UUID, imagePath, message string, rotation float64, senderName *string) (*models.Postcard, error)
	CreateSecret(senderName, imagePath, message string, rotation float64) (*models.Postcard, error)
	GetByID(id uuid.UUID) (*models.Postcard, error)
	List() ([]models.Postcard, error)
	ListByEvent(eventID uuid.UUID) ([]models.Postcard, error)
	ListSecret() ([]models.Postcard, error)
	ListSecretByEvent(eventID uuid.UUID) ([]models.Postcard, error)
	RevealSecretBox() ([]models.Postcard, error)
	RevealSecretBoxByEvent(eventID uuid.UUID) ([]models.Postcard, error)
	RevealPostcard(id uuid.UUID) (*models.Postcard, error)
	GetSecretBoxStatus() (*models.SecretBoxStatus, error)
	GetSecretBoxStatusByEvent(eventID uuid.UUID) (*models.SecretBoxStatus, error)
}

// BroadcastHub define las operaciones de broadcast usadas por los handlers.
// Permite inyectar mocks en tests sin necesidad de un Hub WebSocket real.
type BroadcastHub interface {
	BroadcastRanking(ranking []models.RankingEntry)
	BroadcastPostcard(postcard models.Postcard)
	BroadcastSecretReveal(postcards []models.Postcard)
	// Room-specific broadcasts
	BroadcastRankingToRoom(eventSlug string, ranking []models.RankingEntry)
	BroadcastPostcardToRoom(eventSlug string, postcard models.Postcard)
	BroadcastSecretRevealToRoom(eventSlug string, postcards []models.Postcard)
}

// Handler maneja las peticiones HTTP
type Handler struct {
	playerRepo       *repository.PlayerRepository
	quizRepo         *repository.QuizRepository
	quizQuestionRepo *repository.QuizQuestionRepository
	postcardRepo     PostcardRepo
	scorer           *services.Scorer
	hub              BroadcastHub
	uploadsDir       string
}

// NewHandler crea un nuevo handler
func NewHandler(playerRepo *repository.PlayerRepository, quizRepo *repository.QuizRepository, quizQuestionRepo *repository.QuizQuestionRepository, postcardRepo *repository.PostcardRepository, hub *websocket.Hub, uploadsDir string) *Handler {
	return &Handler{
		playerRepo:       playerRepo,
		quizRepo:         quizRepo,
		quizQuestionRepo: quizQuestionRepo,
		postcardRepo:     postcardRepo,
		scorer:           services.NewScorer(),
		hub:              hub,
		uploadsDir:       uploadsDir,
	}
}

// CreatePlayer crea un nuevo jugador (legacy - sin evento)
func (h *Handler) CreatePlayer(c *gin.Context) {
	var req models.CreatePlayerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Avatar por defecto si no se proporciona
	avatar := req.Avatar
	if avatar == "" {
		avatar = "👤"
	}

	player, err := h.playerRepo.Create(req.Name, avatar)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create player"})
		return
	}

	c.JSON(http.StatusCreated, player)
}

// CreatePlayerScoped crea un jugador scopado al evento actual
func (h *Handler) CreatePlayerScoped(c *gin.Context) {
	var req models.CreatePlayerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Obtener event_id del contexto
	eventID, exists := c.Get("event_id")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
		return
	}

	// Avatar por defecto si no se proporciona
	avatar := req.Avatar
	if avatar == "" {
		avatar = "👤"
	}

	player, err := h.playerRepo.CreateWithEvent(eventID.(uuid.UUID), req.Name, avatar)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create player"})
		return
	}

	c.JSON(http.StatusCreated, player)
}

// GetPlayer obtiene un jugador por ID
func (h *Handler) GetPlayer(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
		return
	}

	player, err := h.playerRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		return
	}

	c.JSON(http.StatusOK, player)
}

// ListPlayers lista todos los jugadores (legacy - sin filtro de evento)
func (h *Handler) ListPlayers(c *gin.Context) {
	players, err := h.playerRepo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list players"})
		return
	}

	c.JSON(http.StatusOK, players)
}

// ListPlayersScoped lista jugadores del evento actual
func (h *Handler) ListPlayersScoped(c *gin.Context) {
	eventID, exists := c.Get("event_id")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Event not in context"})
		return
	}

	players, err := h.playerRepo.ListByEvent(eventID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list players"})
		return
	}

	c.JSON(http.StatusOK, players)
}

// SubmitQuiz envía las respuestas del quiz
func (h *Handler) SubmitQuiz(c *gin.Context) {
	var req models.SubmitQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Obtener playerID del header o del body
	playerIDStr := c.GetHeader("X-Player-ID")
	if playerIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Player ID required"})
		return
	}

	playerID, err := uuid.Parse(playerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
		return
	}

	// Cross-event player validation: ensure player belongs to this event
	var eventID uuid.UUID
	if eID, exists := c.Get("event_id"); exists {
		eventID = eID.(uuid.UUID)
		player, playerErr := h.playerRepo.GetByID(playerID)
		if playerErr != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
			return
		}
		if player.EventID != eventID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Player does not belong to this event"})
			return
		}
	}

	// Obtener el normalizador desde el scorer
	normalizer := h.scorer.GetNormalizer()

	// Normalizar las respuestas de favoritos antes de guardar
	normalizedFavorites := h.scorer.NormalizeFavorites(req.Favorites)

	// Normalizar las respuestas de preferencias
	normalizedPreferences := h.scorer.NormalizePreferences(req.Preferences)

	// Sanitizar la descripción (no eliminar artículos, solo limpiar)
	sanitizedDescription := normalizer.SanitizeDescription(req.Description)

	// Guardar respuestas NORMALIZADAS
	if err := h.quizRepo.SaveAnswers(playerID, normalizedFavorites, normalizedPreferences, sanitizedDescription); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save answers"})
		return
	}

	// Calcular puntaje - intentar usar preguntas de DB primero, luego fallback a legacy
	var score int
	scorer := h.scorer

	// Si hay event_id, intentar cargar preguntas de la DB
	if eventID != uuid.Nil && h.quizQuestionRepo != nil {
		questions, qErr := h.quizQuestionRepo.ListByEvent(eventID)
		if qErr == nil && len(questions) > 0 {
			// Usar scorer con preguntas de DB
			scorer = services.NewScorerWithQuestions(questions)
		}
	}

	// Calcular puntaje usando las respuestas YA NORMALIZADAS
	score = scorer.Calculate(normalizedFavorites, normalizedPreferences)

	// Actualizar puntaje del jugador
	if err := h.playerRepo.UpdateScore(playerID, score); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update score"})
		return
	}

	// Obtener ranking actualizado y broadcastear por WebSocket
	// Si hay event_id en el contexto, usar ListByEvent, sino List
	var players []models.Player
	if eventID != uuid.Nil {
		players, err = h.playerRepo.ListByEvent(eventID)
	} else {
		players, err = h.playerRepo.List()
	}

	if err == nil && h.hub != nil {
		ranking := make([]models.RankingEntry, len(players))
		for i, player := range players {
			ranking[i] = models.RankingEntry{
				Position: i + 1,
				Player:   player,
			}
		}
		// Usar broadcast por room si hay event_slug, si no broadcast global
		if eventSlug, exists := c.Get("event_slug"); exists {
			h.hub.BroadcastRankingToRoom(eventSlug.(string), ranking)
		} else {
			h.hub.BroadcastRanking(ranking)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"score":   score,
		"message": "Quiz submitted successfully",
	})
}

// GetQuizAnswers obtiene las respuestas de un jugador
func (h *Handler) GetQuizAnswers(c *gin.Context) {
	playerID, err := uuid.Parse(c.Param("playerId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
		return
	}

	answers, err := h.quizRepo.GetAnswersByPlayerID(playerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Answers not found"})
		return
	}

	c.JSON(http.StatusOK, answers)
}

// QuizQuestionResponse representa una pregunta del quiz para la API (sin correct_answers)
type QuizQuestionResponse struct {
	ID           uuid.UUID `json:"id"`
	Section      string    `json:"section"`
	Key          string    `json:"key"`
	QuestionText string    `json:"question_text"`
	Options      []string  `json:"options,omitempty"`
	SortOrder    int       `json:"sort_order"`
	IsScorable   bool      `json:"is_scorable"`
}

// GetQuizQuestions obtiene las preguntas del quiz para el evento actual.
// NO retorna correct_answers para evitar hacer trampa.
func (h *Handler) GetQuizQuestions(c *gin.Context) {
	// Obtener event_id del contexto
	eventID, exists := c.Get("event_id")
	if !exists {
		// Si no hay evento en contexto, intentar obtener preguntas legacy (sin evento)
		// Esto es para backward compatibility con el endpoint legacy /api/quiz/questions
		questions, err := h.quizQuestionRepo.ListByEvent(uuid.Nil)
		if err != nil || len(questions) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No quiz questions found"})
			return
		}
		h.returnQuestionsResponse(questions, c)
		return
	}

	questions, err := h.quizQuestionRepo.ListByEvent(eventID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get quiz questions"})
		return
	}

	if len(questions) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No quiz questions found for this event"})
		return
	}

	h.returnQuestionsResponse(questions, c)
}

// returnQuestionsResponse helper para devolver preguntas sin correct_answers
func (h *Handler) returnQuestionsResponse(questions []models.QuizQuestion, c *gin.Context) {
	response := make([]QuizQuestionResponse, len(questions))
	for i, q := range questions {
		response[i] = QuizQuestionResponse{
			ID:           q.ID,
			Section:      q.Section,
			Key:          q.Key,
			QuestionText: q.QuestionText,
			Options:      q.Options,
			SortOrder:    q.SortOrder,
			IsScorable:   q.IsScorable,
		}
	}
	c.JSON(http.StatusOK, gin.H{"questions": response})
}

// GetRanking obtiene el ranking de jugadores
func (h *Handler) GetRanking(c *gin.Context) {
	// Si hay event_id en el contexto, usar ListByEvent, sino List
	var players []models.Player
	var err error
	if eventID, exists := c.Get("event_id"); exists {
		players, err = h.playerRepo.ListByEvent(eventID.(uuid.UUID))
	} else {
		players, err = h.playerRepo.List()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get ranking"})
		return
	}

	// Construir ranking con posiciones
	ranking := make([]models.RankingEntry, len(players))
	for i, player := range players {
		ranking[i] = models.RankingEntry{
			Position: i + 1,
			Player:   player,
		}
	}

	c.JSON(http.StatusOK, ranking)
}

// ==========================================
// Postcards (Cartelera de Corcho)
// ==========================================

// ==========================================
// Helpers internos
// ==========================================

// validateAndSaveImage valida el archivo de imagen y lo guarda en disco.
// Retorna la ruta pública y la ruta en disco, o un error con su mensaje HTTP.
func (h *Handler) validateAndSaveImage(c *gin.Context) (publicPath, diskPath string, httpErr *struct {
	Code    int
	Message string
}) {
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusBadRequest, "Image file required"}
	}
	defer file.Close()

	// Leer los primeros 512 bytes para detectar tipo real
	buffer := make([]byte, 512)
	if _, err := file.Read(buffer); err != nil && err != io.EOF {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusInternalServerError, "Failed to read file"}
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusInternalServerError, "Failed to process file"}
	}

	detectedType := http.DetectContentType(buffer)
	if detectedType != "image/jpeg" && detectedType != "image/png" && detectedType != "image/webp" {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusBadRequest, "Invalid file content. Only JPEG, PNG, and WebP images are allowed"}
	}

	if header.Size > 10*1024*1024 {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusBadRequest, "Image too large (max 10MB)"}
	}

	ext := ".jpg"
	if detectedType == "image/png" {
		ext = ".png"
	} else if detectedType == "image/webp" {
		ext = ".webp"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	uploadsDir := h.uploadsDir
	if uploadsDir == "" {
		uploadsDir = "/app/uploads/postcards"
	}
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusInternalServerError, "Failed to create uploads directory"}
	}

	diskPath = filepath.Join(uploadsDir, filename)
	dst, err := os.Create(diskPath)
	if err != nil {
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusInternalServerError, "Failed to save image"}
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(diskPath)
		return "", "", &struct {
			Code    int
			Message string
		}{http.StatusInternalServerError, "Failed to write image"}
	}

	publicPath = "/uploads/postcards/" + filename
	return publicPath, diskPath, nil
}

// truncateMessage trunca el mensaje a maxLen caracteres
func truncateMessage(msg string, maxLen int) string {
	if len(msg) > maxLen {
		return msg[:maxLen]
	}
	return msg
}

// ==========================================
// Postcards (Cartelera de Corcho)
// ==========================================

// CreatePostcard crea una nueva postal regular.
// Soporta dos modos:
//  1. Con X-Player-ID header: usa el jugador existente
//  2. Sin player_id: crea un jugador inline desde name+avatar en form data
//     (permite usar el corkboard sin haber jugado el quiz)
func (h *Handler) CreatePostcard(c *gin.Context) {
	// Obtener playerID del header (opcional)
	playerIDStr := c.GetHeader("X-Player-ID")

	var playerID *uuid.UUID
	var err error

	if playerIDStr != "" {
		// Modo 1: jugador existente
		id, parseErr := uuid.Parse(playerIDStr)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
			return
		}
		playerID = &id

		// Verificar que el jugador existe
		player, lookupErr := h.playerRepo.GetByID(id)
		if lookupErr != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
			return
		}

		// Cross-event validation: ensure player belongs to this event
		if eventID, exists := c.Get("event_id"); exists {
			if player.EventID != eventID.(uuid.UUID) {
				c.JSON(http.StatusForbidden, gin.H{"error": "Player does not belong to this event"})
				return
			}
		}
	} else {
		// Modo 2: inline player registration
		// Necesitamos name y avatar del form data
		rawName := truncateMessage(c.Request.FormValue("name"), 255)
		rawAvatar := truncateMessage(c.Request.FormValue("avatar"), 10)

		if rawName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Player ID or name required"})
			return
		}

		// Avatar por defecto si no se proporciona
		if rawAvatar == "" {
			rawAvatar = "👤"
		}

		// Crear jugador inline
		var player *models.Player

		if eventID, exists := c.Get("event_id"); exists {
			player, err = h.playerRepo.CreateWithEvent(eventID.(uuid.UUID), rawName, rawAvatar)
		} else {
			player, err = h.playerRepo.Create(rawName, rawAvatar)
		}

		if err != nil {
			fmt.Printf("[ERROR] CreatePostcard inline player creation failed: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create player"})
			return
		}

		playerID = &player.ID
	}

	publicPath, diskPath, httpErr := h.validateAndSaveImage(c)
	if httpErr != nil {
		c.JSON(httpErr.Code, gin.H{"error": httpErr.Message})
		return
	}

	message := truncateMessage(c.Request.FormValue("message"), 500)

	// sender_name opcional: permite que alguien use el celular de otro
	rawSenderName := truncateMessage(c.Request.FormValue("sender_name"), 255)
	var senderName *string
	if rawSenderName != "" {
		senderName = &rawSenderName
	}

	rotation := (rand.Float64() * 60) - 30 // -30 a 30

	// Si hay event_id en el contexto, usar CreateWithEvent
	var postcard *models.Postcard
	if eventID, exists := c.Get("event_id"); exists {
		postcard, err = h.postcardRepo.CreateWithEvent(eventID.(uuid.UUID), playerID, publicPath, message, rotation, senderName)
	} else {
		postcard, err = h.postcardRepo.Create(*playerID, publicPath, message, rotation, senderName)
	}

	if err != nil {
		os.Remove(diskPath)
		fmt.Printf("[ERROR] CreatePostcard repo.Create failed: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create postcard"})
		return
	}

	if h.hub != nil {
		// Usar broadcast por room si hay event_slug
		if eventSlug, exists := c.Get("event_slug"); exists {
			h.hub.BroadcastPostcardToRoom(eventSlug.(string), *postcard)
		} else {
			h.hub.BroadcastPostcard(*postcard)
		}
	}

	c.JSON(http.StatusCreated, postcard)
}

// CreateSecretPostcard crea una postal secreta vía link compartible.
// No requiere jugador registrado. Valida el token de acceso.
func (h *Handler) CreateSecretPostcard(c *gin.Context) {
	// Validar token de acceso
	token := c.GetHeader("X-Secret-Token")
	expectedToken := os.Getenv("SECRET_BOX_TOKEN")
	if expectedToken == "" || token != expectedToken {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing secret token"})
		return
	}

	// sender_name es obligatorio para secretas
	senderName := truncateMessage(c.Request.FormValue("sender_name"), 255)
	if senderName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sender_name is required for secret postcards"})
		return
	}

	publicPath, diskPath, httpErr := h.validateAndSaveImage(c)
	if httpErr != nil {
		c.JSON(httpErr.Code, gin.H{"error": httpErr.Message})
		return
	}

	message := truncateMessage(c.Request.FormValue("message"), 500)
	rotation := (rand.Float64() * 60) - 30

	postcard, err := h.postcardRepo.CreateSecret(senderName, publicPath, message, rotation)
	if err != nil {
		os.Remove(diskPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create secret postcard"})
		return
	}

	// Si la Secret Box ya fue revelada, auto-revelar esta postal y broadcastearla
	// como postal regular (el momento de sorpresa ya pasó, que aparezca nomás)
	status, statusErr := h.postcardRepo.GetSecretBoxStatus()
	if statusErr == nil && status.Revealed {
		if revealed, revealErr := h.postcardRepo.RevealPostcard(postcard.ID); revealErr == nil {
			postcard = revealed
			if h.hub != nil {
				// Secret postcards get broadcast to the room if available
				if eventSlug, exists := c.Get("event_slug"); exists {
					h.hub.BroadcastPostcardToRoom(eventSlug.(string), *postcard)
				} else {
					h.hub.BroadcastPostcard(*postcard)
				}
			}
		}
		// Si falla el reveal, la postal igual se creó — no es catastrófico
	}
	// Si aún no fue revelada: NO broadcast — sigue siendo una sorpresa 🎁

	c.JSON(http.StatusCreated, postcard)
}

// GetSecretBoxStatus devuelve el estado de la Secret Box (total de secretas, si fue revelada)
func (h *Handler) GetSecretBoxStatus(c *gin.Context) {
	// Si hay event_id en el contexto, usar versión scoped
	if eventID, exists := c.Get("event_id"); exists {
		status, err := h.postcardRepo.GetSecretBoxStatusByEvent(eventID.(uuid.UUID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get secret box status"})
			return
		}
		c.JSON(http.StatusOK, status)
		return
	}

	// Fallback: versión global (backward compatibility)
	status, err := h.postcardRepo.GetSecretBoxStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get secret box status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// ListSecretPostcards devuelve todas las postales secretas (para preview del admin)
func (h *Handler) ListSecretPostcards(c *gin.Context) {
	// Si hay event_id en el contexto, usar versión scoped
	if eventID, exists := c.Get("event_id"); exists {
		postcards, err := h.postcardRepo.ListSecretByEvent(eventID.(uuid.UUID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list secret postcards"})
			return
		}

		if postcards == nil {
			postcards = []models.Postcard{}
		}

		c.JSON(http.StatusOK, postcards)
		return
	}

	// Fallback: versión global (backward compatibility)
	postcards, err := h.postcardRepo.ListSecret()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list secret postcards"})
		return
	}

	if postcards == nil {
		postcards = []models.Postcard{}
	}

	c.JSON(http.StatusOK, postcards)
}

// RevealSecretBox revela la Secret Box: actualiza revealed_at y hace broadcast WS.
// Idempotente: si ya fue revelada, devuelve las postales con 200 (no 409).
func (h *Handler) RevealSecretBox(c *gin.Context) {
	var postcards []models.Postcard
	var err error

	// Si hay event_id en el contexto, usar versión scoped
	if eventID, exists := c.Get("event_id"); exists {
		postcards, err = h.postcardRepo.RevealSecretBoxByEvent(eventID.(uuid.UUID))
	} else {
		// Fallback: versión global (backward compatibility)
		postcards, err = h.postcardRepo.RevealSecretBox()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reveal secret box"})
		return
	}

	if postcards == nil {
		postcards = []models.Postcard{}
	}

	// Broadcast a todos los clientes conectados — dispara la animación
	if h.hub != nil && len(postcards) > 0 {
		// Usar broadcast por room si hay event_slug
		if eventSlug, exists := c.Get("event_slug"); exists {
			h.hub.BroadcastSecretRevealToRoom(eventSlug.(string), postcards)
		} else {
			h.hub.BroadcastSecretReveal(postcards)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Secret Box revealed",
		"postcards": postcards,
	})
}

// ListPostcards obtiene todas las postales
func (h *Handler) ListPostcards(c *gin.Context) {
	// Si hay event_id en el contexto, usar ListByEvent, sino List
	var postcards []models.Postcard
	var err error
	if eventID, exists := c.Get("event_id"); exists {
		postcards, err = h.postcardRepo.ListByEvent(eventID.(uuid.UUID))
	} else {
		postcards, err = h.postcardRepo.List()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list postcards"})
		return
	}

	// Devolver array vacío en lugar de null si no hay postales
	if postcards == nil {
		postcards = []models.Postcard{}
	}

	c.JSON(http.StatusOK, postcards)
}

// ==========================================
// Descriptions (Estampillas del Corkboard)
// ==========================================

// GetDescriptions devuelve todas las descripciones de Mile de forma anónima
func (h *Handler) GetDescriptions(c *gin.Context) {
	descriptions, err := h.quizRepo.ListDescriptions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get descriptions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"descriptions": descriptions})
}
