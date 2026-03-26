package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/models"
)

// EventUpdater define la operación para actualizar un evento.
// Permite inyectar mocks en tests.
type EventUpdater interface {
	Update(event *models.Event) error
}

// UpdateFeaturesRequest body para actualizar features del evento
type UpdateFeaturesRequest struct {
	Features struct {
		Quiz      bool `json:"quiz"`
		Corkboard bool `json:"corkboard"`
		SecretBox bool `json:"secret_box"` // Accept snake_case from frontend
	} `json:"features" binding:"required"`
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
	uploadsDir   string
}

// NewAdminEventHandler crea un nuevo handler de admin de eventos
func NewAdminEventHandler(eventUpdater EventUpdater, uploadsDir string) *AdminEventHandler {
	return &AdminEventHandler{
		eventUpdater: eventUpdater,
		uploadsDir:   uploadsDir,
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

// UploadMedia POST /api/admin/events/:slug/media
// Sube logo o imagen de fondo para el evento.
// Acepta multipart form con campos:
//   - type: "logo" o "background"
//   - file: archivo de imagen
func (h *AdminEventHandler) UploadMedia(c *gin.Context) {
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	eventModel := event.(*models.Event)

	mediaType := c.Request.FormValue("type")
	if mediaType != "logo" && mediaType != "background" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type. Must be 'logo' or 'background'"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File required"})
		return
	}
	defer file.Close()

	// Leer los primeros 512 bytes para detectar tipo
	buffer := make([]byte, 512)
	if _, err := file.Read(buffer); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}
	if _, err := file.Seek(0, 0); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process file"})
		return
	}

	detectedType := http.DetectContentType(buffer)
	if detectedType != "image/jpeg" && detectedType != "image/png" && detectedType != "image/webp" && detectedType != "image/gif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed"})
		return
	}

	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 5MB)"})
		return
	}

	// Determinar extensión
	ext := ".jpg"
	switch detectedType {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	case "image/gif":
		ext = ".gif"
	}

	// Crear directorio si no existe
	subDir := "logos"
	if mediaType == "background" {
		subDir = "backgrounds"
	}

	baseDir := h.uploadsDir
	if baseDir == "" {
		baseDir = os.Getenv("UPLOADS_DIR")
	}
	if baseDir == "" {
		baseDir = "/app/uploads"
	}

	uploadDir := filepath.Join(baseDir, subDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generar nombre de archivo único
	filename := fmt.Sprintf("%s_%s%s", eventModel.Slug, uuid.New().String()[:8], ext)
	diskPath := filepath.Join(uploadDir, filename)

	// Guardar archivo
	dst, err := os.Create(diskPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(diskPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file"})
		return
	}

	// Construir URL pública
	publicPath := fmt.Sprintf("/uploads/%s/%s", subDir, filename)

	// Actualizar el modelo del evento
	if mediaType == "logo" {
		eventModel.Settings.LogoURL = publicPath
	} else {
		eventModel.Settings.BackgroundURL = publicPath
	}

	// Guardar en DB
	if err := h.eventUpdater.Update(eventModel); err != nil {
		os.Remove(diskPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"type":  mediaType,
		"url":   publicPath,
		"event": eventModel,
	})
}

// DeleteMedia DELETE /api/admin/events/:slug/media
// Elimina el logo o imagen de fondo del evento.
func (h *AdminEventHandler) DeleteMedia(c *gin.Context) {
	event, exists := c.Get("event")
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	eventModel := event.(*models.Event)

	mediaType := c.Request.FormValue("type")
	if mediaType != "logo" && mediaType != "background" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type. Must be 'logo' or 'background'"})
		return
	}

	// Obtener la URL actual
	var currentURL string
	if mediaType == "logo" {
		currentURL = eventModel.Settings.LogoURL
		eventModel.Settings.LogoURL = ""
	} else {
		currentURL = eventModel.Settings.BackgroundURL
		eventModel.Settings.BackgroundURL = ""
	}

	// Intentar eliminar el archivo物理
	if currentURL != "" {
		// Convertir URL pública a ruta de disco
		// /uploads/logos/file.jpg -> /app/uploads/logos/file.jpg
		relativePath := currentURL[1:] // quitar el "/" inicial
		diskPath := filepath.Join(h.uploadsDir, "..", relativePath)
		os.Remove(diskPath) // ignorar errores si no existe
	}

	// Guardar en DB
	if err := h.eventUpdater.Update(eventModel); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"type":  mediaType,
		"event": eventModel,
	})
}
