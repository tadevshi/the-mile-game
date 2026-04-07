package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

// DriveEncryptionKey is the 32-byte AES-256 key set via DRIVE_ENCRYPTION_KEY env var
var DriveEncryptionKey []byte

// SetDriveEncryptionKey sets the encryption key from a base64-encoded string or raw bytes.
// It accepts:
//   - A raw 32-byte string (exact key content)
//   - A base64-encoded string that decodes to exactly 32 bytes
//
// For generating a new key: openssl rand -32 | base64
func SetDriveEncryptionKey(key string) error {
	if len(key) == 32 {
		// Raw 32-byte key
		DriveEncryptionKey = []byte(key)
		return nil
	}

	// Try base64 decode
	decoded, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return errors.New("DRIVE_ENCRYPTION_KEY must be 32 raw bytes or base64-encoded 32 bytes")
	}
	if len(decoded) != 32 {
		return errors.New("DRIVE_ENCRYPTION_KEY must decode to 32 bytes for AES-256")
	}
	DriveEncryptionKey = decoded
	return nil
}

// EncryptToken encrypts a plaintext string using AES-256-GCM
// Returns base64-encoded ciphertext
func EncryptToken(plaintext string) (string, error) {
	if DriveEncryptionKey == nil {
		return "", errors.New("Drive encryption key not set")
	}

	block, err := aes.NewCipher(DriveEncryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptToken decrypts a base64-encoded ciphertext using AES-256-GCM
// Returns plaintext string
func DecryptToken(ciphertextBase64 string) (string, error) {
	if DriveEncryptionKey == nil {
		return "", errors.New("Drive encryption key not set")
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(DriveEncryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// GenerateIdempotencyKey generates a unique idempotency key from postcard_id and media_hash
func GenerateIdempotencyKey(postcardID, mediaHash string) string {
	return postcardID + ":" + mediaHash
}
