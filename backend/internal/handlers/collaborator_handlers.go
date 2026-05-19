package handlers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// CollaboratorRepo define las operaciones de repositorio para colaboradores
type CollaboratorRepo interface {
	Create(eventID, userID uuid.UUID) (*models.Collaborator, error)
	ListByEvent(eventID uuid.UUID) ([]models.Collaborator, error)
	Delete(eventID, userID uuid.UUID) error
}

// EventUpdaterGetter define operaciones para obtener y actualizar eventos
type EventUpdaterGetter interface {
	GetBySlug(slug string) (*models.Event, error)
	GetByInviteToken(token string) (*models.Event, error)
	Update(event *models.Event) error
}

// CollaboratorHandler maneja las peticiones de colaboradores de eventos
type CollaboratorHandler struct {
	collabRepo CollaboratorRepo
	eventRepo  EventUpdaterGetter
}

// NewCollaboratorHandler crea un nuevo handler de colaboradores
func NewCollaboratorHandler(collabRepo CollaboratorRepo, eventRepo EventUpdaterGetter) *CollaboratorHandler {
	return &CollaboratorHandler{
		collabRepo: collabRepo,
		eventRepo:  eventRepo,
	}
}

// GenerateInviteToken POST /api/admin/events/:slug/collaborators/invite
// Genera un nuevo token de invitación para el evento.
// Solo el owner puede generar invitaciones (verificado por OwnerOnlyMiddleware).
func (h *CollaboratorHandler) GenerateInviteToken(c *gin.Context) {
	slug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Generar nuevo token
	newToken := uuid.New().String()
	event.InviteToken = &newToken

	if err := h.eventRepo.Update(event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save invite token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     newToken,
		"share_url": buildInviteURL(slug, newToken),
	})
}

// GetInviteToken GET /api/admin/events/:slug/collaborators/invite
// Retorna el token de invitación existente o genera uno nuevo si no existe.
func (h *CollaboratorHandler) GetInviteToken(c *gin.Context) {
	slug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.InviteToken != nil && *event.InviteToken != "" {
		c.JSON(http.StatusOK, gin.H{
			"token":     *event.InviteToken,
			"share_url": buildInviteURL(slug, *event.InviteToken),
		})
		return
	}

	// Generar nuevo token si no existe
	newToken := uuid.New().String()
	event.InviteToken = &newToken

	if err := h.eventRepo.Update(event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save invite token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     newToken,
		"share_url": buildInviteURL(slug, newToken),
	})
}

// ListCollaborators GET /api/admin/events/:slug/collaborators
// Lista todos los colaboradores del evento (incluye datos de usuario).
func (h *CollaboratorHandler) ListCollaborators(c *gin.Context) {
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	eventModel := event.(*models.Event)

	collaborators, err := h.collabRepo.ListByEvent(eventModel.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list collaborators"})
		return
	}

	if collaborators == nil {
		collaborators = []models.Collaborator{}
	}

	c.JSON(http.StatusOK, collaborators)
}

// RemoveCollaborator DELETE /api/admin/events/:slug/collaborators/:user_id
// Elimina un colaborador del evento. Solo el owner puede eliminar colaboradores.
func (h *CollaboratorHandler) RemoveCollaborator(c *gin.Context) {
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	eventModel := event.(*models.Event)

	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// No permitir que el owner se remueva a sí mismo
	if userID == eventModel.OwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot remove the event owner"})
		return
	}

	if err := h.collabRepo.Delete(eventModel.ID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove collaborator"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Collaborator removed"})
}

// AcceptInvitation POST /api/collaborators/accept
// Acepta una invitación vía token. El usuario debe estar autenticado.
// Query param: ?token=TOKEN
func (h *CollaboratorHandler) AcceptInvitation(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	// Obtener user_id del contexto (seteado por AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	currentUserID := userID.(uuid.UUID)

	// Buscar evento por invite_token
	event, err := h.findEventByInviteToken(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invitation"})
		return
	}

	// No permitir que el owner se agregue como colaborador
	if currentUserID == event.OwnerID {
		c.JSON(http.StatusConflict, gin.H{"error": "You are already the owner of this event"})
		return
	}

	collaborator, err := h.collabRepo.Create(event.ID, currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Successfully joined event",
		"event":      event,
		"user_id":    collaborator.UserID,
	})
}

// findEventByInviteToken busca un evento por su invite_token
func (h *CollaboratorHandler) findEventByInviteToken(token string) (*models.Event, error) {
	return h.eventRepo.GetByInviteToken(token)
}

// buildInviteURL construye la URL de invitación
func buildInviteURL(slug, token string) string {
	baseURL := os.Getenv("APP_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}
	return baseURL + "/join/" + slug + "?token=" + token
}
