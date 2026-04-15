package services

import (
	"encoding/base64"
	"errors"
	"testing"
)

func TestSetDriveEncryptionKey(t *testing.T) {
	tests := []struct {
		name        string
		key         string
		expectError bool
		expectedLen int
	}{
		{
			name:        "32-byte raw key",
			key:         "12345678901234567890123456789012",
			expectError: false,
			expectedLen: 32,
		},
		{
			name:        "base64-encoded 32-byte key",
			key:         base64.StdEncoding.EncodeToString([]byte("12345678901234567890123456789012")),
			expectError: false,
			expectedLen: 32,
		},
		{
			name:        "key too short",
			key:         "short",
			expectError: true,
			expectedLen: 0,
		},
		{
			name:        "key wrong length (not 32)",
			key:         "1234567890123456789012345678901",
			expectError: true,
			expectedLen: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := SetDriveEncryptionKey(tt.key)
			if tt.expectError && err == nil {
				t.Error("expected error but got nil")
			}
			if !tt.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !tt.expectError && len(DriveEncryptionKey) != tt.expectedLen {
				t.Errorf("key length = %d, want %d", len(DriveEncryptionKey), tt.expectedLen)
			}
		})
	}
}

func TestEncryptDecryptToken(t *testing.T) {
	// Set up a test key
	testKey := "12345678901234567890123456789012"
	if err := SetDriveEncryptionKey(testKey); err != nil {
		t.Fatalf("failed to set test key: %v", err)
	}

	tests := []struct {
		name      string
		plaintext string
	}{
		{
			name:      "simple token",
			plaintext: "my-refresh-token-12345",
		},
		{
			name:      "empty string",
			plaintext: "",
		},
		{
			name:      "unicode characters",
			plaintext: "tokén-with-unicode-ñ",
		},
		{
			name:      "long token",
			plaintext: "a very long refresh token that might be used for oauth2 with google drive api endpoints and lots of other data here to encrypt properly",
		},
		{
			name:      "special characters",
			plaintext: "token-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Encrypt
			ciphertext, err := EncryptToken(tt.plaintext)
			if err != nil {
				t.Fatalf("EncryptToken failed: %v", err)
			}

			// Ciphertext should be different from plaintext
			if ciphertext == tt.plaintext && tt.plaintext != "" {
				t.Error("ciphertext should not equal plaintext")
			}

			// Decrypt
			decrypted, err := DecryptToken(ciphertext)
			if err != nil {
				t.Fatalf("DecryptToken failed: %v", err)
			}

			// Should match original
			if decrypted != tt.plaintext {
				t.Errorf("decrypted = %q, want %q", decrypted, tt.plaintext)
			}
		})
	}
}

func TestEncryptToken_NoKeySet(t *testing.T) {
	// Save original key and restore after test
	originalKey := DriveEncryptionKey
	defer func() { DriveEncryptionKey = originalKey }()

	DriveEncryptionKey = nil

	_, err := EncryptToken("some token")
	if err == nil {
		t.Error("expected error when key not set")
	}
	if err != nil && err.Error() != "Drive encryption key not set" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestDecryptToken_NoKeySet(t *testing.T) {
	// Save original key and restore after test
	originalKey := DriveEncryptionKey
	defer func() { DriveEncryptionKey = originalKey }()

	DriveEncryptionKey = nil

	_, err := DecryptToken("some ciphertext")
	if err == nil {
		t.Error("expected error when key not set")
	}
	if err != nil && err.Error() != "Drive encryption key not set" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestDecryptToken_InvalidCiphertext(t *testing.T) {
	// Set up a test key
	testKey := "12345678901234567890123456789012"
	if err := SetDriveEncryptionKey(testKey); err != nil {
		t.Fatalf("failed to set test key: %v", err)
	}

	tests := []struct {
		name       string
		ciphertext string
		wantErr    error
	}{
		{
			name:       "invalid base64",
			ciphertext: "not-valid-base64!!!",
			wantErr:    errors.New("illegal base64 data at input byte 0"),
		},
		{
			name:       "too short ciphertext",
			ciphertext: base64.StdEncoding.EncodeToString([]byte("short")),
			wantErr:    errors.New("ciphertext too short"),
		},
		{
			name:       "tampered ciphertext",
			ciphertext: "dGVzdC10b2tlbi10YW1wZXJlZA==", // "test-token-tampered" base64
			wantErr:    nil,                            // GCM will catch this
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := DecryptToken(tt.ciphertext)
			if tt.wantErr != nil {
				if err == nil {
					t.Errorf("expected error %v but got nil", tt.wantErr)
				}
			}
			// For tampered ciphertext, we just want any error (GCM auth failure)
			if tt.name == "tampered ciphertext" && err == nil {
				t.Error("expected error for tampered ciphertext")
			}
		})
	}
}

func TestGenerateIdempotencyKey(t *testing.T) {
	tests := []struct {
		name       string
		postcardID string
		mediaHash  string
		expected   string
	}{
		{
			name:       "simple keys",
			postcardID: "abc-123",
			mediaHash:  "hash-456",
			expected:   "abc-123:hash-456",
		},
		{
			name:       "UUID format",
			postcardID: "550e8400-e29b-41d4-a716-446655440000",
			mediaHash:  "sha256:abc123def456",
			expected:   "550e8400-e29b-41d4-a716-446655440000:sha256:abc123def456",
		},
		{
			name:       "empty media hash",
			postcardID: "postcard-123",
			mediaHash:  "",
			expected:   "postcard-123:",
		},
		{
			name:       "empty postcard ID",
			postcardID: "",
			mediaHash:  "hash-456",
			expected:   ":hash-456",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateIdempotencyKey(tt.postcardID, tt.mediaHash)
			if result != tt.expected {
				t.Errorf("GenerateIdempotencyKey(%q, %q) = %q, want %q",
					tt.postcardID, tt.mediaHash, result, tt.expected)
			}
		})
	}
}

func TestEncryptDecrypt_IsolatedPerCall(t *testing.T) {
	// Set up a test key
	testKey := "12345678901234567890123456789012"
	if err := SetDriveEncryptionKey(testKey); err != nil {
		t.Fatalf("failed to set test key: %v", err)
	}

	// Encrypt the same plaintext multiple times - should get different ciphertexts due to random nonce
	plaintext := "same-token"
	ciphertexts := make(map[string]bool)

	for i := 0; i < 5; i++ {
		ct, err := EncryptToken(plaintext)
		if err != nil {
			t.Fatalf("EncryptToken iteration %d failed: %v", i, err)
		}

		if ciphertexts[ct] {
			t.Error("got duplicate ciphertext from different encrypt calls")
		}
		ciphertexts[ct] = true

		// All should decrypt to same plaintext
		decrypted, err := DecryptToken(ct)
		if err != nil {
			t.Fatalf("DecryptToken iteration %d failed: %v", i, err)
		}
		if decrypted != plaintext {
			t.Errorf("iteration %d: decrypted = %q, want %q", i, decrypted, plaintext)
		}
	}
}
