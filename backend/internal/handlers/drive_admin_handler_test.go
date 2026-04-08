package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/services"
)

// ============== MOCKS ==============

// mockBackupWorker is a mock backup worker for testing
type mockBackupWorker struct {
	EnqueueBackupJobFunc   func(postcardID uuid.UUID, idempotencyKey string) (uuid.UUID, error)
	EnqueueExistingJobFunc func(postcardID uuid.UUID, idempotencyKey string, jobID uuid.UUID) error
}

func (m *mockBackupWorker) EnqueueBackupJob(postcardID uuid.UUID, idempotencyKey string) (uuid.UUID, error) {
	if m.EnqueueBackupJobFunc != nil {
		return m.EnqueueBackupJobFunc(postcardID, idempotencyKey)
	}
	return uuid.New(), nil
}

func (m *mockBackupWorker) EnqueueExistingJob(postcardID uuid.UUID, idempotencyKey string, jobID uuid.UUID) error {
	if m.EnqueueExistingJobFunc != nil {
		return m.EnqueueExistingJobFunc(postcardID, idempotencyKey, jobID)
	}
	return nil
}

// mockDriveService is a mock Drive service implementing DriveServiceOperator interface
type mockDriveService struct {
	GenerateAuthURLFunc func(state string) (string, error)
	ExchangeCodeFunc    func(ctx context.Context, code string) (*services.TokenResponse, error)
	EncryptTokenFunc    func(plaintext string) (string, error)
	DecryptTokenFunc    func(ciphertext string) (string, error)
	RevokeTokenFunc     func(ctx context.Context, token string) error
}

func (m *mockDriveService) GenerateAuthURL(state string) (string, error) {
	if m.GenerateAuthURLFunc != nil {
		return m.GenerateAuthURLFunc(state)
	}
	return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state, nil
}

func (m *mockDriveService) ExchangeCode(ctx context.Context, code string) (*services.TokenResponse, error) {
	if m.ExchangeCodeFunc != nil {
		return m.ExchangeCodeFunc(ctx, code)
	}
	return &services.TokenResponse{
		AccessToken:  "test-access-token",
		RefreshToken: "test-refresh-token",
		ExpiresIn:    3600,
		Expiry:       time.Now().Add(time.Hour),
	}, nil
}

func (m *mockDriveService) EncryptToken(plaintext string) (string, error) {
	if m.EncryptTokenFunc != nil {
		return m.EncryptTokenFunc(plaintext)
	}
	return "encrypted-" + plaintext, nil
}

func (m *mockDriveService) DecryptToken(ciphertext string) (string, error) {
	if m.DecryptTokenFunc != nil {
		return m.DecryptTokenFunc(ciphertext)
	}
	return "decrypted-" + ciphertext, nil
}

func (m *mockDriveService) RevokeToken(ctx context.Context, token string) error {
	if m.RevokeTokenFunc != nil {
		return m.RevokeTokenFunc(ctx, token)
	}
	return nil
}

// Ensure mockDriveService implements DriveServiceOperator
var _ DriveServiceOperator = (*mockDriveService)(nil)

// ============== HELPERS ==============

func setupTestContext(userID uuid.UUID) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	}
}

// ============== TESTS for GetDriveAuthURL ==============

func TestGetDriveAuthURL_FeatureDisabled(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, false)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(setupTestContext(uuid.New()))
	r.GET("/api/admin/drive/auth-url", handler.GetDriveAuthURL)

	req, _ := http.NewRequest("GET", "/api/admin/drive/auth-url", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetDriveAuthURL_Unauthorized(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	// No user_id set
	r.GET("/api/admin/drive/auth-url", handler.GetDriveAuthURL)

	req, _ := http.NewRequest("GET", "/api/admin/drive/auth-url", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ============== TESTS for GetDriveStatus ==============

func TestGetDriveStatus_FeatureDisabled(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, false)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(setupTestContext(uuid.New()))
	r.GET("/api/admin/drive/status", handler.GetDriveStatus)

	req, _ := http.NewRequest("GET", "/api/admin/drive/status", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, false, response["connected"])
	assert.Equal(t, false, response["enabled"])
}

// ============== TESTS for DisconnectDrive ==============

func TestDisconnectDrive_FeatureDisabled(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, false)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(setupTestContext(uuid.New()))
	r.POST("/api/admin/drive/disconnect", handler.DisconnectDrive)

	req, _ := http.NewRequest("POST", "/api/admin/drive/disconnect", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

// ============== TESTS for ListBackupJobs ==============

func TestListBackupJobs_FeatureDisabled(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, false)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(setupTestContext(uuid.New()))
	r.GET("/api/admin/drive/backup-jobs", handler.ListBackupJobs)

	req, _ := http.NewRequest("GET", "/api/admin/drive/backup-jobs", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestListBackupJobs_Unauthorized(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	// No user_id set
	r.GET("/api/admin/drive/backup-jobs", handler.ListBackupJobs)

	req, _ := http.NewRequest("GET", "/api/admin/drive/backup-jobs", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ============== TESTS for RetryBackupJob ==============

func TestRetryBackupJob_InvalidJobID(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(setupTestContext(uuid.New()))
	r.POST("/api/admin/drive/backup-jobs/:id/retry", handler.RetryBackupJob)

	req, _ := http.NewRequest("POST", "/api/admin/drive/backup-jobs/invalid-uuid/retry", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRetryBackupJob_FeatureDisabled(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, false)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(setupTestContext(uuid.New()))
	r.POST("/api/admin/drive/backup-jobs/:id/retry", handler.RetryBackupJob)

	req, _ := http.NewRequest("POST", "/api/admin/drive/backup-jobs/"+uuid.New().String()+"/retry", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

// ============== TESTS for GetDriveCallback ==============

func TestGetDriveCallback_MissingCode(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/admin/drive/callback", handler.GetDriveCallback)

	req, _ := http.NewRequest("GET", "/api/admin/drive/callback", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetDriveCallback_OAuthError(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/admin/drive/callback", handler.GetDriveCallback)

	req, _ := http.NewRequest("GET", "/api/admin/drive/callback?error=access_denied", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "oauth_error", response["error"])
}

func TestGetDriveCallback_MissingState(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/admin/drive/callback", handler.GetDriveCallback)

	req, _ := http.NewRequest("GET", "/api/admin/drive/callback?code=abc123", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetDriveCallback_InvalidState(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/admin/drive/callback", handler.GetDriveCallback)

	// code present but state is invalid base64
	req, _ := http.NewRequest("GET", "/api/admin/drive/callback?code=abc123&state=not-valid-base64!!!", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetDriveCallback_InvalidStateFormat(t *testing.T) {
	handler := NewDriveAdminHandler(nil, nil, nil, nil, true)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/admin/drive/callback", handler.GetDriveCallback)

	// Valid base64 but not JSON
	req, _ := http.NewRequest("GET", "/api/admin/drive/callback?code=abc123&state="+base64.StdEncoding.EncodeToString([]byte("not-json")), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ============== TESTS for signed state helpers ==============

func TestSignState_UniquePerPayload(t *testing.T) {
	userID1 := uuid.New()
	userID2 := uuid.New()

	token1, err := signState(userID1)
	require.NoError(t, err)

	token2, err := signState(userID2)
	require.NoError(t, err)

	assert.NotEmpty(t, token1)
	assert.NotEmpty(t, token2)
	assert.NotEqual(t, token1, token2)

	verifiedUser1, err := verifyState(token1)
	require.NoError(t, err)
	assert.Equal(t, userID1, verifiedUser1)

	verifiedUser2, err := verifyState(token2)
	require.NoError(t, err)
	assert.Equal(t, userID2, verifiedUser2)
}

// ============== TESTS for interface compliance ==============

func TestBackupWorkerEnqueuer_Interface(t *testing.T) {
	// Verify BackupWorkerEnqueuer interface is implemented correctly
	mock := &mockBackupWorker{
		EnqueueBackupJobFunc: func(postcardID uuid.UUID, idempotencyKey string) (uuid.UUID, error) {
			return uuid.New(), nil
		},
		EnqueueExistingJobFunc: func(postcardID uuid.UUID, idempotencyKey string, jobID uuid.UUID) error {
			return nil
		},
	}

	var _ BackupWorkerEnqueuer = mock
}

// ============== TESTS for HMAC-Signed State ==============

func TestSignState_ProducesValidSignedState(t *testing.T) {
	// Set a known signing key for deterministic testing
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	userID := uuid.New()
	signedState, err := signState(userID)
	require.NoError(t, err)
	assert.NotEmpty(t, signedState)

	// State should be in format: base64(payload).signature
	parts := strings.Split(signedState, ".")
	require.Len(t, parts, 2, "Signed state should have payload.signature format")

	// Verify the state can be decoded
	verifiedUserID, err := verifyState(signedState)
	require.NoError(t, err)
	assert.Equal(t, userID, verifiedUserID)
}

func TestVerifyState_RejectsInvalidSignature(t *testing.T) {
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	userID := uuid.New()
	signedState, err := signState(userID)
	require.NoError(t, err)

	// Tamper with the signature
	parts := strings.Split(signedState, ".")
	parts[1] = "invalid-signature"
	tamperedState := parts[0] + "." + parts[1]

	_, err = verifyState(tamperedState)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid state signature")
}

func TestVerifyState_RejectsExpiredState(t *testing.T) {
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	userID := uuid.New()

	// Create a state manually with old timestamp
	// Use a proper 16-byte nonce encoded as hex (32 hex chars)
	nonceBytes := []byte("test-nonce-16chr") // 18 bytes, will be truncated
	nonce := make([]byte, 16)
	copy(nonce, nonceBytes)
	hexNonce := hex.EncodeToString(nonce) // 32 hex characters

	oldTs := time.Now().Add(-15 * time.Minute).Unix() // 15 minutes ago (expired)
	payload := fmt.Sprintf("%s:%d:%s", userID.String(), oldTs, hexNonce)

	key := "test-secret-key-for-unit-tests"
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	expiredState := base64.URLEncoding.EncodeToString([]byte(payload)) + "." + signature

	_, err := verifyState(expiredState)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "state expired")
}

func TestVerifyState_RejectsInvalidFormat(t *testing.T) {
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	// No dots - invalid format
	_, err := verifyState("no-dots-here")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid state format")

	// Empty parts
	_, err = verifyState(".")
	require.Error(t, err)
}

func TestVerifyState_RejectsInvalidPayload(t *testing.T) {
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	// Create an invalid payload that doesn't match user_id:ts:nonce format
	invalidPayloadBytes := []byte("not-valid-format")
	invalidPayloadB64 := base64.URLEncoding.EncodeToString(invalidPayloadBytes)

	// Compute HMAC on the DECODED bytes (as verifyState does)
	key := "test-secret-key-for-unit-tests"
	h := hmac.New(sha256.New, []byte(key))
	h.Write(invalidPayloadBytes) // Write decoded bytes, not base64 string
	signature := hex.EncodeToString(h.Sum(nil))

	invalidState := invalidPayloadB64 + "." + signature

	_, err := verifyState(invalidState)
	require.Error(t, err)
	// HMAC passes but payload parsing fails because "not-valid-format" is not user_id:ts:nonce
	assert.Contains(t, err.Error(), "invalid state payload")
}

// ============== TESTS for GetDriveCallback with HMAC-signed State ==============

func TestGetDriveCallback_VerifiesSignedState(t *testing.T) {
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	userID := uuid.New()
	signedState, err := signState(userID)
	require.NoError(t, err)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Test with tampered state - should return 400 Bad Request due to invalid signature
	tamperedState := signedState + "tampered"
	handler := &DriveAdminHandler{
		driveService:   &mockDriveService{},
		driveRepo:      nil, // Will panic on nil if signature check passes - that's why we tamper
		featureEnabled: true,
	}
	r.GET("/callback", handler.GetDriveCallback)

	req2, _ := http.NewRequest("GET", "/callback?code=test-auth-code&state="+tamperedState, nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusBadRequest, w2.Code)
	var response map[string]interface{}
	unmarshalErr := json.Unmarshal(w2.Body.Bytes(), &response)
	require.NoError(t, unmarshalErr)
	assert.Contains(t, response["error"], "Invalid state")
}

func TestGetDriveCallback_RejectsExpiredState(t *testing.T) {
	os.Setenv("DRIVE_STATE_SECRET", "test-secret-key-for-unit-tests")
	defer os.Unsetenv("DRIVE_STATE_SECRET")

	userID := uuid.New()

	// Create an expired state manually
	nonceBytes := []byte("test-nonce-16chr")
	nonce := make([]byte, 16)
	copy(nonce, nonceBytes)
	hexNonce := hex.EncodeToString(nonce)

	oldTs := time.Now().Add(-15 * time.Minute).Unix()
	payload := fmt.Sprintf("%s:%d:%s", userID.String(), oldTs, hexNonce)

	key := "test-secret-key-for-unit-tests"
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	expiredState := base64.URLEncoding.EncodeToString([]byte(payload)) + "." + signature

	handler := &DriveAdminHandler{
		driveService:   &mockDriveService{},
		driveRepo:      nil, // Will panic if signature check passes first
		featureEnabled: true,
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/callback", handler.GetDriveCallback)

	req, _ := http.NewRequest("GET", "/callback?code=test-auth-code&state="+expiredState, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var response map[string]interface{}
	unmarshalErr := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, unmarshalErr)
	assert.Contains(t, response["error"], "state expired")
}
