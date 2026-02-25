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

// CreatePostcard crea una nueva postal con imagen subida
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

	// Obtener el archivo de imagen del multipart form
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file required"})
		return
	}
	defer file.Close()

	// Validar el contenido real del archivo leyendo los primeros 512 bytes
	buffer := make([]byte, 512)
	if _, err := file.Read(buffer); err != nil && err != io.EOF {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Volver el puntero del archivo al principio para que io.Copy lo guarde entero después
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process file"})
		return
	}

	// Detectar el tipo de contenido real ignorando lo que diga el header
	detectedType := http.DetectContentType(buffer)
	if detectedType != "image/jpeg" && detectedType != "image/png" && detectedType != "image/webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file content. Only JPEG, PNG, and WebP images are allowed"})
		return
	}

	// Validar tamaño (max 10MB)
	if header.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image too large (max 10MB)"})
		return
	}

	// Obtener mensaje del form
	message := c.Request.FormValue("message")
	if len(message) > 500 {
		message = message[:500]
	}

	// Forzar la extensión basada en el tipo MIME detectado, JAMÁS confiar en el header
	ext := ".jpg"
	if detectedType == "image/png" {
		ext = ".png"
	} else if detectedType == "image/webp" {
		ext = ".webp"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Crear directorio de uploads si no existe
	uploadsDir := os.Getenv("UPLOADS_DIR")
	if uploadsDir == "" {
		uploadsDir = "/app/uploads/postcards"
	}
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create uploads directory"})
		return
	}

	// Guardar archivo en disco
	filePath := filepath.Join(uploadsDir, filename)
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write image"})
		return
	}

	// Generar rotación aleatoria entre -30 y 30 grados
	// En Go 1.20+ math/rand viene auto-seedeado, no hace falta instanciar un generador nuevo
	// cada request porque es costoso y de principiante.
	rotation := (rand.Float64() * 60) - 30 // -30 a 30

	// Ruta pública de la imagen (servida por nginx)
	publicImagePath := "/uploads/postcards/" + filename

	// Guardar en DB
	postcard, err := h.postcardRepo.Create(playerID, publicImagePath, message, rotation)
	if err != nil {
		// Si falla la DB, limpiar el archivo subido
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create postcard"})
		return
	}

	// Broadcast por WebSocket a todos los clientes
	if h.hub != nil {
		h.hub.BroadcastPostcard(*postcard)
	}

	c.JSON(http.StatusCreated, postcard)
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
