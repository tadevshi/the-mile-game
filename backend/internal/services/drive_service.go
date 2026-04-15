package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/the-mile-game/backend/internal/models"
)

// DefaultOAuthEndpoints contains the default Google OAuth endpoints
const (
	DefaultAuthURL        = "https://accounts.google.com/o/oauth2/v2/auth"
	DefaultTokenEndpoint  = "https://oauth2.googleapis.com/token"
	DefaultRevokeEndpoint = "https://oauth2.googleapis.com/revoke"
	DefaultAPIEndpoint    = "https://www.googleapis.com"
	DefaultDriveScope     = "https://www.googleapis.com/auth/drive.file"
)

// DriveHTTPClient interface for making HTTP requests (allows mocking)
type DriveHTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// DriveService handles Google Drive OAuth and API operations
type DriveService struct {
	Config         *models.DriveBackupConfig
	APIEndpoint    string
	TokenEndpoint  string
	RevokeEndpoint string
	httpClient     DriveHTTPClient
}

// TokenResponse represents Google's OAuth token response
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in"`
	IDToken      string    `json:"id_token,omitempty"`
	Expiry       time.Time // Computed: time when token expires
}

// DriveFileResponse represents Google's Drive API file creation response
type DriveFileResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	MimeType string `json:"mimeType,omitempty"`
}

type driveFileListResponse struct {
	Files []DriveFileResponse `json:"files"`
}

// UploadResult represents the result of a file upload operation
type UploadResult struct {
	DriveFileID string
	Name        string
	MimeType    string
}

// NewDriveService creates a new Drive service with the given configuration
func NewDriveService(config *models.DriveBackupConfig) *DriveService {
	svc := &DriveService{
		Config:     config,
		httpClient: http.DefaultClient,
	}

	// Set default endpoints if not provided
	if config.TokenEndpoint == "" {
		svc.TokenEndpoint = DefaultTokenEndpoint
	} else {
		svc.TokenEndpoint = config.TokenEndpoint
	}
	if config.RevokeEndpoint == "" {
		svc.RevokeEndpoint = DefaultRevokeEndpoint
	} else {
		svc.RevokeEndpoint = config.RevokeEndpoint
	}
	if config.APIEndpoint == "" {
		svc.APIEndpoint = DefaultAPIEndpoint
	} else {
		svc.APIEndpoint = config.APIEndpoint
	}

	return svc
}

// ValidateConfig validates that required configuration is present
func (s *DriveService) ValidateConfig() error {
	if s.Config.ClientID == "" {
		return fmt.Errorf("GOOGLE_CLIENT_ID is required")
	}
	if s.Config.ClientSecret == "" {
		return fmt.Errorf("GOOGLE_CLIENT_SECRET is required")
	}
	if s.Config.RedirectURI == "" {
		return fmt.Errorf("GOOGLE_REDIRECT_URI is required")
	}
	return nil
}

// GenerateAuthURL generates the Google OAuth authorization URL
func (s *DriveService) GenerateAuthURL(state string) (string, error) {
	if err := s.ValidateConfig(); err != nil {
		return "", err
	}

	params := url.Values{}
	params.Set("client_id", s.Config.ClientID)
	params.Set("redirect_uri", s.Config.RedirectURI)
	params.Set("response_type", "code")
	params.Set("scope", DefaultDriveScope)
	params.Set("access_type", "offline")
	params.Set("prompt", "consent") // Force consent screen to get refresh token
	params.Set("state", state)

	// Use configured AuthURL if provided, otherwise use default
	authURL := DefaultAuthURL
	if s.Config.AuthURL != "" {
		authURL = s.Config.AuthURL
	}

	return fmt.Sprintf("%s?%s", authURL, params.Encode()), nil
}

// ExchangeCode exchanges an authorization code for tokens
func (s *DriveService) ExchangeCode(ctx context.Context, code string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", s.Config.ClientID)
	data.Set("client_secret", s.Config.ClientSecret)
	data.Set("redirect_uri", s.Config.RedirectURI)
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token exchange failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	// Compute the expiry time
	tokenResp.Expiry = s.CalculateExpiry(tokenResp.ExpiresIn)

	return &tokenResp, nil
}

// RefreshToken refreshes an access token using a refresh token.
// If Google returns a new refresh token (token rotation), it is preserved in the response.
func (s *DriveService) RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", s.Config.ClientID)
	data.Set("client_secret", s.Config.ClientSecret)
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token refresh failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token refresh failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	// Compute the expiry time if expires_in is present
	if tokenResp.ExpiresIn > 0 {
		tokenResp.Expiry = s.CalculateExpiry(tokenResp.ExpiresIn)
	}

	// Note: Google may return a new refresh token (token rotation).
	// If a new refresh token is returned, it should replace the old one.
	// The caller (worker) is responsible for persisting the new refresh token if present.
	// If no new refresh token is returned, the original remains valid.

	return &tokenResp, nil
}

// RevokeToken revokes an OAuth token
func (s *DriveService) RevokeToken(ctx context.Context, token string) error {
	data := url.Values{}
	data.Set("token", token)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.RevokeEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("token revocation failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("token revocation failed with status %d", resp.StatusCode)
	}

	return nil
}

// UploadFile uploads a file to Google Drive using uploadType=media.
// The content must be binary-safe (image/video data), so we use bytes.Reader.
func (s *DriveService) UploadFile(ctx context.Context, accessToken string, content []byte, mimeType, idempotencyKey string) (*UploadResult, error) {
	uploadURL := fmt.Sprintf("%s/upload/drive/v3/files?uploadType=media", s.APIEndpoint)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, bytes.NewReader(content))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", mimeType)
	req.Header.Set("X-Upload-Id", idempotencyKey) // For idempotency

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	var fileResp DriveFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&fileResp); err != nil {
		return nil, fmt.Errorf("failed to decode upload response: %w", err)
	}

	return &UploadResult{
		DriveFileID: fileResp.ID,
		Name:        fileResp.Name,
		MimeType:    fileResp.MimeType,
	}, nil
}

func (s *DriveService) EnsureFolder(ctx context.Context, accessToken, folderName string, parentID *string) (string, error) {
	folderID, err := s.FindFolder(ctx, accessToken, folderName, parentID)
	if err != nil {
		return "", err
	}
	if folderID != "" {
		return folderID, nil
	}
	return s.CreateFolder(ctx, accessToken, folderName, parentID)
}

func (s *DriveService) FindFolder(ctx context.Context, accessToken, folderName string, parentID *string) (string, error) {
	query := fmt.Sprintf("name = '%s' and mimeType = 'application/vnd.google-apps.folder' and trashed = false", escapeDriveQueryValue(folderName))
	if parentID != nil && *parentID != "" {
		query += fmt.Sprintf(" and '%s' in parents", escapeDriveQueryValue(*parentID))
	}

	endpoint := fmt.Sprintf("%s/drive/v3/files?q=%s&fields=files(id,name,mimeType)&pageSize=1", s.APIEndpoint, url.QueryEscape(query))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create folder lookup request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("folder lookup failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("folder lookup failed with status %d: %s", resp.StatusCode, string(body))
	}

	var listResp driveFileListResponse
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return "", fmt.Errorf("failed to decode folder lookup response: %w", err)
	}

	if len(listResp.Files) == 0 {
		return "", nil
	}

	return listResp.Files[0].ID, nil
}

func (s *DriveService) CreateFolder(ctx context.Context, accessToken, folderName string, parentID *string) (string, error) {
	metadata := map[string]any{
		"name":     folderName,
		"mimeType": "application/vnd.google-apps.folder",
	}
	if parentID != nil && *parentID != "" {
		metadata["parents"] = []string{*parentID}
	}

	body, err := json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to marshal folder metadata: %w", err)
	}

	endpoint := fmt.Sprintf("%s/drive/v3/files", s.APIEndpoint)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create folder request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("folder creation failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("folder creation failed with status %d: %s", resp.StatusCode, string(body))
	}

	var fileResp DriveFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&fileResp); err != nil {
		return "", fmt.Errorf("failed to decode folder creation response: %w", err)
	}

	return fileResp.ID, nil
}

// UploadFileMultipart uploads a file using multipart form data (for metadata).
// Uses bytes.Buffer for binary-safe multipart body construction.
func (s *DriveService) UploadFileMultipart(ctx context.Context, accessToken string, fileContent []byte, filename, mimeType, idempotencyKey string, parentID *string) (*UploadResult, error) {
	uploadURL := fmt.Sprintf("%s/upload/drive/v3/files?uploadType=multipart", s.APIEndpoint)

	// Create multipart body using bytes.Buffer for binary safety
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Write metadata part
	part, err := writer.CreateFormField("metadata")
	if err != nil {
		return nil, fmt.Errorf("failed to create metadata part: %w", err)
	}
	metadataMap := map[string]any{"name": filename}
	if parentID != nil && *parentID != "" {
		metadataMap["parents"] = []string{*parentID}
	}
	metadataJSON, _ := json.Marshal(metadataMap)
	if _, err := part.Write(metadataJSON); err != nil {
		return nil, fmt.Errorf("failed to write metadata: %w", err)
	}

	// Write media part
	mediaPart, err := writer.CreateFormFile("media", filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create media part: %w", err)
	}
	if _, err := mediaPart.Write(fileContent); err != nil {
		return nil, fmt.Errorf("failed to write file content: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, bytes.NewReader(body.Bytes()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-Upload-Id", idempotencyKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var fileResp DriveFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&fileResp); err != nil {
		return nil, fmt.Errorf("failed to decode upload response: %w", err)
	}

	return &UploadResult{
		DriveFileID: fileResp.ID,
		Name:        fileResp.Name,
		MimeType:    fileResp.MimeType,
	}, nil
}

func escapeDriveQueryValue(value string) string {
	return strings.ReplaceAll(value, "'", "\\'")
}

// IsTokenExpired checks if a token expiry time has passed
func (s *DriveService) IsTokenExpired(expiry time.Time) bool {
	// Add a small buffer (1 minute) to handle clock skew
	return time.Now().Add(time.Minute).After(expiry)
}

// CalculateExpiry returns the expiry time given a duration from now
func (s *DriveService) CalculateExpiry(secondsFromNow int) time.Time {
	return time.Now().Add(time.Duration(secondsFromNow) * time.Second)
}

// EncryptToken encrypts a token using AES-256-GCM
func (s *DriveService) EncryptToken(plaintext string) (string, error) {
	return EncryptToken(plaintext)
}

// DecryptToken decrypts a token using AES-256-GCM
func (s *DriveService) DecryptToken(ciphertext string) (string, error) {
	return DecryptToken(ciphertext)
}
