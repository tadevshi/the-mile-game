package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/the-mile-game/backend/internal/models"
)

type mockCollaboratorChecker struct {
	exists bool
}

func (m *mockCollaboratorChecker) Exists(eventID, userID uuid.UUID) (bool, error) {
	return m.exists, nil
}

func TestAdminMiddleware_OwnerAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	event := &models.Event{
		ID:      uuid.New(),
		OwnerID: ownerID,
	}

	r.Use(func(c *gin.Context) {
		c.Set("user_id", ownerID)
		c.Set("event", event)
		c.Next()
	})
	r.Use(AdminMiddleware(&mockCollaboratorChecker{exists: false}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminMiddleware_CollaboratorAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	event := &models.Event{
		ID:      uuid.New(),
		OwnerID: ownerID,
	}

	r.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Set("event", event)
		c.Next()
	})
	r.Use(AdminMiddleware(&mockCollaboratorChecker{exists: true}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminMiddleware_NonCollaboratorForbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	event := &models.Event{
		ID:      uuid.New(),
		OwnerID: ownerID,
	}

	r.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Set("event", event)
		c.Next()
	})
	r.Use(AdminMiddleware(&mockCollaboratorChecker{exists: false}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminMiddleware_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	event := &models.Event{
		ID:      uuid.New(),
		OwnerID: uuid.New(),
	}

	r.Use(func(c *gin.Context) {
		c.Set("event", event)
		c.Next()
	})
	r.Use(AdminMiddleware(&mockCollaboratorChecker{exists: false}))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
