package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/the-mile-game/backend/internal/models"
)

// ========== Tests for DriveService config and initialization ==========

func TestNewDriveService(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}

	// Set encryption key for token operations
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	svc := NewDriveService(config)

	if svc == nil {
		t.Fatal("Expected non-nil DriveService")
	}
	if svc.Config != config {
		t.Error("Expected config to be set")
	}
}

func TestDriveService_GenerateAuthURL(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	svc := NewDriveService(config)

	state := "test-state-token"
	url, err := svc.GenerateAuthURL(state)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if url == "" {
		t.Error("Expected non-empty URL")
	}

	// URL should contain Google OAuth endpoint
	expectedBase := "https://accounts.google.com/o/oauth2/v2/auth"
	if len(url) < len(expectedBase) || url[:len(expectedBase)] != expectedBase {
		t.Errorf("Expected URL to start with %s, got %s", expectedBase, url)
	}

	// URL should contain client_id
	if !strings.Contains(url, "client_id=test-client-id") {
		t.Error("Expected URL to contain client_id")
	}

	// URL should contain redirect_uri
	if !strings.Contains(url, "redirect_uri=") {
		t.Error("Expected URL to contain redirect_uri")
	}

	// URL should contain scope
	if !strings.Contains(url, "scope=") {
		t.Error("Expected URL to contain scope")
	}

	// URL should contain state
	if !strings.Contains(url, "state="+state) {
		t.Error("Expected URL to contain state")
	}

	// URL should contain response_type=code
	if !strings.Contains(url, "response_type=code") {
		t.Error("Expected URL to contain response_type=code")
	}

	// URL should contain access_type=offline (for refresh token)
	if !strings.Contains(url, "access_type=offline") {
		t.Error("Expected URL to contain access_type=offline")
	}

	// URL should contain prompt=consent (to force consent screen even if already authorized)
	if !strings.Contains(url, "prompt=consent") {
		t.Error("Expected URL to contain prompt=consent")
	}
}

func TestDriveService_GenerateAuthURL_CustomAuthURL(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		AuthURL:       "https://custom-auth.example.com/oauth2/auth",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	svc := NewDriveService(config)

	state := "test-state-token"
	url, err := svc.GenerateAuthURL(state)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if url == "" {
		t.Error("Expected non-empty URL")
	}

	// URL should use the custom AuthURL from config
	expectedBase := "https://custom-auth.example.com/oauth2/auth"
	if len(url) < len(expectedBase) || url[:len(expectedBase)] != expectedBase {
		t.Errorf("Expected URL to start with custom auth URL %s, got %s", expectedBase, url)
	}
}

func TestDriveService_ExchangeCode_Success(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	// Mock server that returns valid token response
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/token" {
			t.Errorf("Expected path /token, got %s", r.URL.Path)
		}
		if r.FormValue("client_id") != "test-client-id" {
			t.Errorf("Expected client_id=test-client-id, got %s", r.FormValue("client_id"))
		}
		if r.FormValue("client_secret") != "test-client-secret" {
			t.Errorf("Expected client_secret=test-client-secret, got %s", r.FormValue("client_secret"))
		}
		if r.FormValue("redirect_uri") != "http://localhost:8081/api/admin/drive/callback" {
			t.Errorf("Expected redirect_uri, got %s", r.FormValue("redirect_uri"))
		}
		if r.FormValue("grant_type") != "authorization_code" {
			t.Errorf("Expected grant_type=authorization_code, got %s", r.FormValue("grant_type"))
		}
		if r.FormValue("code") != "test-auth-code" {
			t.Errorf("Expected code=test-auth-code, got %s", r.FormValue("code"))
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token":  "test-access-token",
			"refresh_token": "test-refresh-token",
			"token_type":    "Bearer",
			"expires_in":    3600,
		})
	}))
	defer mockServer.Close()

	config.TokenEndpoint = mockServer.URL + "/token"
	svc := NewDriveService(config)

	result, err := svc.ExchangeCode(context.Background(), "test-auth-code")

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if result.AccessToken != "test-access-token" {
		t.Errorf("Expected access_token=test-access-token, got %s", result.AccessToken)
	}
	if result.RefreshToken != "test-refresh-token" {
		t.Errorf("Expected refresh_token=test-refresh-token, got %s", result.RefreshToken)
	}
	if result.TokenType != "Bearer" {
		t.Errorf("Expected token_type=Bearer, got %s", result.TokenType)
	}
	if result.ExpiresIn != 3600 {
		t.Errorf("Expected expires_in=3600, got %d", result.ExpiresIn)
	}
	if result.Expiry.Before(time.Now()) {
		t.Error("Expected Expiry to be in the future")
	}
}

func TestDriveService_ExchangeCode_HTTPError(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	// Mock server that returns error
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":             "invalid_grant",
			"error_description": "Code expired or invalid",
		})
	}))
	defer mockServer.Close()

	config.TokenEndpoint = mockServer.URL + "/token"
	svc := NewDriveService(config)

	_, err := svc.ExchangeCode(context.Background(), "invalid-code")

	if err == nil {
		t.Error("Expected error for invalid code, got nil")
	}
}

func TestDriveService_RefreshToken_Success(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.FormValue("grant_type") != "refresh_token" {
			t.Errorf("Expected grant_type=refresh_token, got %s", r.FormValue("grant_type"))
		}
		if r.FormValue("refresh_token") != "test-refresh-token" {
			t.Errorf("Expected refresh_token=test-refresh-token, got %s", r.FormValue("refresh_token"))
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "new-access-token",
			"token_type":   "Bearer",
			"expires_in":   3600,
		})
	}))
	defer mockServer.Close()

	config.TokenEndpoint = mockServer.URL + "/token"
	svc := NewDriveService(config)

	result, err := svc.RefreshToken(context.Background(), "test-refresh-token")

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if result.AccessToken != "new-access-token" {
		t.Errorf("Expected access_token=new-access-token, got %s", result.AccessToken)
	}
	if result.RefreshToken != "" {
		t.Error("Expected no new refresh_token in response")
	}
}

func TestDriveService_RefreshToken_WithTokenRotation(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	// Mock server that returns a new refresh token (token rotation)
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.FormValue("grant_type") != "refresh_token" {
			t.Errorf("Expected grant_type=refresh_token, got %s", r.FormValue("grant_type"))
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token":  "new-access-token",
			"refresh_token": "new-rotated-refresh-token",
			"token_type":    "Bearer",
			"expires_in":    3600,
		})
	}))
	defer mockServer.Close()

	config.TokenEndpoint = mockServer.URL + "/token"
	svc := NewDriveService(config)

	result, err := svc.RefreshToken(context.Background(), "old-refresh-token")

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if result.AccessToken != "new-access-token" {
		t.Errorf("Expected access_token=new-access-token, got %s", result.AccessToken)
	}
	// Verify the new refresh token is preserved (token rotation)
	if result.RefreshToken != "new-rotated-refresh-token" {
		t.Errorf("Expected refresh_token=new-rotated-refresh-token, got %s", result.RefreshToken)
	}
}

func TestDriveService_RefreshToken_ExpiredRefreshToken(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":             "invalid_grant",
			"error_description": "Token expired",
		})
	}))
	defer mockServer.Close()

	config.TokenEndpoint = mockServer.URL + "/token"
	svc := NewDriveService(config)

	_, err := svc.RefreshToken(context.Background(), "expired-token")

	if err == nil {
		t.Error("Expected error for expired refresh token, got nil")
	}
}

func TestDriveService_UploadFile_Success(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	driveFileID := "drive-file-123"

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify upload request
		if r.URL.Path != "/upload/drive/v3/files" {
			t.Errorf("Expected path /upload/drive/v3/files, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-access-token" {
			t.Errorf("Expected Authorization header, got %s", r.Header.Get("Authorization"))
		}
		if r.FormValue("uploadType") != "media" {
			t.Errorf("Expected uploadType=media, got %s", r.FormValue("uploadType"))
		}

		// Return created file
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":       driveFileID,
			"name":     "postcard.jpg",
			"mimeType": "image/jpeg",
		})
	}))
	defer mockServer.Close()

	config.APIEndpoint = mockServer.URL
	svc := NewDriveService(config)

	result, err := svc.UploadFile(context.Background(), "test-access-token", []byte("test-file-content"), "image/jpeg", "test-idempotency-key")

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if result.DriveFileID != driveFileID {
		t.Errorf("Expected driveFileID=%s, got %s", driveFileID, result.DriveFileID)
	}
	if result.Name != "postcard.jpg" {
		t.Errorf("Expected name=postcard.jpg, got %s", result.Name)
	}
}

func TestDriveService_UploadFile_DriveAPIError(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": map[string]interface{}{
				"code":    403,
				"message": "Insufficient permission",
			},
		})
	}))
	defer mockServer.Close()

	config.APIEndpoint = mockServer.URL
	svc := NewDriveService(config)

	_, err := svc.UploadFile(context.Background(), "invalid-token", []byte("test-content"), "image/jpeg", "test-key")

	if err == nil {
		t.Error("Expected error for forbidden upload, got nil")
	}
}

// ========== Tests for token encryption/decryption integration ==========

func TestDriveService_TokenEncryption(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	svc := NewDriveService(config)

	plaintext := "my-secret-refresh-token-12345"

	// Encrypt
	encrypted, err := svc.EncryptToken(plaintext)
	if err != nil {
		t.Fatalf("EncryptToken failed: %v", err)
	}

	// Encrypted should be different from plaintext
	if encrypted == plaintext {
		t.Error("Encrypted token should differ from plaintext")
	}

	// Decrypt
	decrypted, err := svc.DecryptToken(encrypted)
	if err != nil {
		t.Fatalf("DecryptToken failed: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("Decrypted token doesn't match original: got %q, want %q", decrypted, plaintext)
	}
}

// ========== Tests for DriveService public API contract ==========

func TestDriveService_ConfigValidation(t *testing.T) {
	// Save original key and restore after test
	originalKey := DriveEncryptionKey
	defer func() { DriveEncryptionKey = originalKey }()

	tests := []struct {
		name    string
		config  *models.DriveBackupConfig
		wantErr bool
	}{
		{
			name: "valid config",
			config: &models.DriveBackupConfig{
				Enabled:       true,
				ClientID:      "test-id",
				ClientSecret:  "test-secret",
				RedirectURI:   "http://localhost/callback",
				EncryptionKey: "12345678901234567890123456789012",
			},
			wantErr: false,
		},
		{
			name: "missing client id",
			config: &models.DriveBackupConfig{
				Enabled:       true,
				ClientID:      "",
				ClientSecret:  "test-secret",
				RedirectURI:   "http://localhost/callback",
				EncryptionKey: "12345678901234567890123456789012",
			},
			wantErr: true,
		},
		{
			name: "missing client secret",
			config: &models.DriveBackupConfig{
				Enabled:       true,
				ClientID:      "test-id",
				ClientSecret:  "",
				RedirectURI:   "http://localhost/callback",
				EncryptionKey: "12345678901234567890123456789012",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := SetDriveEncryptionKey(tt.config.EncryptionKey); err != nil {
				t.Skipf("Skipping: failed to set encryption key: %v", err)
			}

			svc := NewDriveService(tt.config)
			err := svc.ValidateConfig()

			if tt.wantErr && err == nil {
				t.Error("Expected error but got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestDriveService_IsTokenExpired(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	svc := NewDriveService(config)

	// Token expired in the past
	expiredTime := time.Now().Add(-1 * time.Hour)
	if !svc.IsTokenExpired(expiredTime) {
		t.Error("Expected token with past expiry to be expired")
	}

	// Token not expired (in the future)
	validTime := time.Now().Add(1 * time.Hour)
	if svc.IsTokenExpired(validTime) {
		t.Error("Expected token with future expiry to not be expired")
	}

	// Token expired just now
	justExpired := time.Now().Add(-1 * time.Second)
	if !svc.IsTokenExpired(justExpired) {
		t.Error("Expected token expired 1 second ago to be expired")
	}
}

func TestDriveService_RevokeToken_Success(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8081/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/revoke" {
			t.Errorf("Expected path /revoke, got %s", r.URL.Path)
		}
		if r.FormValue("token") != "test-token-to-revoke" {
			t.Errorf("Expected token=test-token-to-revoke, got %s", r.FormValue("token"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	config.RevokeEndpoint = mockServer.URL + "/revoke"
	svc := NewDriveService(config)

	err := svc.RevokeToken(context.Background(), "test-token-to-revoke")

	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}
}

func TestDriveService_RevokeToken_Failure(t *testing.T) {
	config := &models.DriveBackupConfig{
		Enabled:       true,
		ClientID:      "test-client-id",
		ClientSecret:  "test-client-secret",
		RedirectURI:   "http://localhost:8080/api/admin/drive/callback",
		EncryptionKey: "12345678901234567890123456789012",
	}
	if err := SetDriveEncryptionKey(config.EncryptionKey); err != nil {
		t.Fatalf("Failed to set encryption key: %v", err)
	}

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer mockServer.Close()

	config.RevokeEndpoint = mockServer.URL + "/revoke"
	svc := NewDriveService(config)

	err := svc.RevokeToken(context.Background(), "invalid-token")

	if err == nil {
		t.Error("Expected error for revoke failure, got nil")
	}
}
