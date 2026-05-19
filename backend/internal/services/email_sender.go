package services

import (
	"log"
)

// EmailSender interface para envío de emails
type EmailSender interface {
	SendPasswordReset(email, resetURL string) error
}

// ConsoleEmailSender implementa EmailSender usando log (desarrollo)
type ConsoleEmailSender struct{}

// NewConsoleEmailSender crea un EmailSender que solo loguea
func NewConsoleEmailSender() *ConsoleEmailSender {
	return &ConsoleEmailSender{}
}

// SendPasswordReset loguea el URL de reset (implementación de desarrollo)
func (c *ConsoleEmailSender) SendPasswordReset(email, resetURL string) error {
	log.Printf("[EMAIL] Password reset for %s: %s", email, resetURL)
	return nil
}