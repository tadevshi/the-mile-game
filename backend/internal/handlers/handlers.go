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

// Handler maneja las peticiones HTTP
type Handler struct {
	playerRepo   *repository.PlayerRepository
	quizRepo     *repository.QuizRepository
	postcardRepo *repository.PostcardRepository
	scorer       *services.Scorer
	hub          *websocket.Hub
}

// NewHandler crea un nuevo handler
func NewHandler(playerRepo *repository.PlayerRepository, quizRepo *repository.QuizRepository, postcardRepo *repository.PostcardRepository, hub *websocket.Hub) *Handler {
	return &Handler{
		playerRepo:   playerRepo,
		quizRepo:     quizRepo,
		postcardRepo: postcardRepo,
		scorer:       services.NewScorer(),
		hub:          hub,
	}
}

// CreatePlayer crea un nuevo jugador
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

// ListPlayers lista todos los jugadores
func (h *Handler) ListPlayers(c *gin.Context) {
	players, err := h.playerRepo.List()
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

	// Calcular puntaje usando las respuestas YA NORMALIZADAS
	score := h.scorer.Calculate(normalizedFavorites, normalizedPreferences)

	// Actualizar puntaje del jugador
	if err := h.playerRepo.UpdateScore(playerID, score); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update score"})
		return
	}

	// Obtener ranking actualizado y broadcastear por WebSocket
	players, err := h.playerRepo.List()
	if err == nil && h.hub != nil {
		ranking := make([]models.RankingEntry, len(players))
		for i, player := range players {
			ranking[i] = models.RankingEntry{
				Position: i + 1,
				Player:   player,
			}
		}
		h.hub.BroadcastRanking(ranking)
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

// GetRanking obtiene el ranking de jugadores
func (h *Handler) GetRanking(c *gin.Context) {
	players, err := h.playerRepo.List()
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
func validateAndSaveImage(c *gin.Context) (publicPath, diskPath string, httpErr *struct {
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

	uploadsDir := os.Getenv("UPLOADS_DIR")
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

// CreatePostcard crea una nueva postal regular (requiere jugador registrado)
func (h *Handler) CreatePostcard(c *gin.Context) {
	// Obtener playerID del header
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

	// Verificar que el jugador existe
	_, err = h.playerRepo.GetByID(playerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		return
	}

	publicPath, diskPath, httpErr := validateAndSaveImage(c)
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

	postcard, err := h.postcardRepo.Create(playerID, publicPath, message, rotation, senderName)
	if err != nil {
		os.Remove(diskPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create postcard"})
		return
	}

	if h.hub != nil {
		h.hub.BroadcastPostcard(*postcard)
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

	publicPath, diskPath, httpErr := validateAndSaveImage(c)
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

	// NO broadcast: es una sorpresa 🎁
	c.JSON(http.StatusCreated, postcard)
}

// ==========================================
// Admin (Secret Box)
// ==========================================

// validateAdminKey verifica el header X-Admin-Key contra el env var ADMIN_PASSPHRASE.
// Retorna true si válido, false si no (y ya escribió el error HTTP).
func (h *Handler) validateAdminKey(c *gin.Context) bool {
	key := c.GetHeader("X-Admin-Key")
	expected := os.Getenv("ADMIN_PASSPHRASE")
	if expected == "" || key != expected {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing admin key"})
		return false
	}
	return true
}

// GetSecretBoxStatus devuelve el estado de la Secret Box (total de secretas, si fue revelada)
func (h *Handler) GetSecretBoxStatus(c *gin.Context) {
	if !h.validateAdminKey(c) {
		return
	}

	status, err := h.postcardRepo.GetSecretBoxStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get secret box status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// ListSecretPostcards devuelve todas las postales secretas (para preview del admin)
func (h *Handler) ListSecretPostcards(c *gin.Context) {
	if !h.validateAdminKey(c) {
		return
	}

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
	if !h.validateAdminKey(c) {
		return
	}

	postcards, err := h.postcardRepo.RevealSecretBox()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reveal secret box"})
		return
	}

	if postcards == nil {
		postcards = []models.Postcard{}
	}

	// Broadcast a todos los clientes conectados — dispara la animación
	if h.hub != nil && len(postcards) > 0 {
		h.hub.BroadcastSecretReveal(postcards)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Secret Box revealed",
		"postcards": postcards,
	})
}

// ListPostcards obtiene todas las postales
func (h *Handler) ListPostcards(c *gin.Context) {
	postcards, err := h.postcardRepo.List()
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
