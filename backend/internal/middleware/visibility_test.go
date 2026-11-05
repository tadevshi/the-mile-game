package middleware

import (
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

type visibilityCheck func(uuid.UUID, uuid.UUID) (bool, error)

func (f visibilityCheck) Exists(e, u uuid.UUID) (bool, error) { return f(e, u) }

func TestVisibilityExtractionOrdering(t *testing.T) {
	event := &models.Event{ID: uuid.New(), OwnerID: uuid.New(), Visibility: "private"}
	user := uuid.New()
	calls := ""
	collab := visibilityCheck(func(e, u uuid.UUID) (bool, error) {
		require.Equal(t, event.ID, e)
		require.Equal(t, user, u)
		calls += "c"
		return false, nil
	})
	guest := visibilityCheck(func(uuid.UUID, uuid.UUID) (bool, error) { calls += "g"; return true, nil })
	status, message := CheckEventVisibility(event, &user, collab, guest)
	require.Equal(t, 0, status)
	require.Empty(t, message)
	require.Equal(t, "cg", calls)
	calls = ""
	failure := visibilityCheck(func(uuid.UUID, uuid.UUID) (bool, error) { calls += "c"; return false, errors.New("db") })
	status, message = CheckEventVisibility(event, &user, failure, guest)
	require.Equal(t, 500, status)
	require.Equal(t, "Failed to verify permissions", message)
	require.Equal(t, "c", calls)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(EventVisibilityMiddleware(nil, nil))
	r.GET("/", func(c *gin.Context) { t.Fatal("missing context reached handler") })
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	require.Equal(t, 500, w.Code)
	require.Equal(t, `{"error":"Event not in context"}`, w.Body.String())
}
