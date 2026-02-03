package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
)

// Handler maneja las peticiones HTTP
type Handler struct {
	playerRepo *repository.PlayerRepository
	quizRepo   *repository.QuizRepository
	scorer     *services.Scorer
}

// NewHandler crea un nuevo handler
func NewHandler(playerRepo *repository.PlayerRepository, quizRepo *repository.QuizRepository) *Handler {
	return &Handler{
		playerRepo: playerRepo,
		quizRepo:   quizRepo,
		scorer:     services.NewScorer(),
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

	// Guardar respuestas
	if err := h.quizRepo.SaveAnswers(playerID, req.Favorites, req.Preferences, req.Description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save answers"})
		return
	}

	// Calcular puntaje
	score := h.scorer.Calculate(req.Favorites, req.Preferences)

	// Actualizar puntaje del jugador
	if err := h.playerRepo.UpdateScore(playerID, score); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update score"})
		return
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
