package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/the-mile-game/backend/internal/models"
)

// EventUpdater define la operación para actualizar un evento.
// Permite inyectar mocks en tests.
type EventUpdater interface {
	Update(event *models.Event) error
}

// UpdateFeaturesRequest body para actualizar features del evento
type UpdateFeaturesRequest struct {
	Features models.EventFeatures `json:"features" binding:"required"`
}

// allowedFeatures keys que se pueden actualizar
var allowedFeatures = map[string]bool{
	"quiz":       true,
	"corkboard":  true,
	"secret_box": true,
}

// AdminEventHandler maneja las peticiones admin de eventos
type AdminEventHandler struct {
	eventUpdater EventUpdater
}

// NewAdminEventHandler crea un nuevo handler de admin de eventos
func NewAdminEventHandler(eventUpdater EventUpdater) *AdminEventHandler {
	return &AdminEventHandler{
		eventUpdater: eventUpdater,
	}
}

// UpdateEventFeatures PUT /api/admin/events/:slug/features
// Actualiza los feature flags del evento (merge, no overwrite)
func (h *AdminEventHandler) UpdateEventFeatures(c *gin.Context) {
	// El evento ya está en el contexto gracias a EventMiddleware
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	eventModel := event.(*models.Event)

	// Leer el body para validar las keys primero
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parsear a map para validar keys
	var rawRequest map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &rawRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Extraer features del map
	featuresData, ok := rawRequest["features"].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: 'features' is required"})
		return
	}

	// Validar que solo se usen keys permitidas
	for key := range featuresData {
		if !allowedFeatures[key] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feature key: " + key + ". Allowed keys: quiz, corkboard, secret_box"})
			return
		}
	}

	// Ahora parsear correctamente al struct
	var req UpdateFeaturesRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Merge: only update provided fields
	// Explicit false values ARE applied (they're sent in the request)
	if featuresData["quiz"] != nil {
		eventModel.Features.Quiz = req.Features.Quiz
	}
	if featuresData["corkboard"] != nil {
		eventModel.Features.Corkboard = req.Features.Corkboard
	}
	if featuresData["secret_box"] != nil {
		eventModel.Features.SecretBox = req.Features.SecretBox
	}

	// Actualizar en DB
	if err := h.eventUpdater.Update(eventModel); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event features"})
		return
	}

	// Devolver evento actualizado
	c.JSON(http.StatusOK, eventModel)
}
