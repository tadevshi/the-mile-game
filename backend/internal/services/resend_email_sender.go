package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ResendEmailSender implementa EmailSender usando la API de Resend
// (https://resend.com) para envío real de emails en producción.
type ResendEmailSender struct {
	apiKey string
	from   string
	client *http.Client
}

// NewResendEmailSender crea un sender usando la API de Resend.
// Si apiKey está vacío, retorna nil (debe chequearse antes de usar).
func NewResendEmailSender(apiKey, from string) *ResendEmailSender {
	if apiKey == "" {
		return nil
	}
	return &ResendEmailSender{
		apiKey: apiKey,
		from:   from,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// SendPasswordReset envía el email de recuperación via Resend.
func (r *ResendEmailSender) SendPasswordReset(email, resetURL string) error {
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Recuperar contraseña — EventHub</title>
  <style>
    body { font-family: 'Montserrat', sans-serif; background: #FFF5F7; padding: 40px; }
    .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #DB2777; font-size: 20px; margin-bottom: 16px; }
    p { color: #4a3f44; line-height: 1.6; margin-bottom: 24px; }
    .button { display: inline-block; background: #DB2777; color: white; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 600; }
    .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; }
    .link { word-break: break-all; color: #DB2777; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Recuperar contraseña</h1>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en EventHub.</p>
    <p style="text-align:center;">
      <a href="%s" class="button">Restablecer contraseña</a>
    </p>
    <p style="font-size:13px;">Este link expira en 15 minutos. Si no solicitaste el cambio, podés ignorar este email.</p>
    <p style="font-size:13px;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
      <span class="link">%s</span>
    </p>
    <div class="footer">
      EventHub — Plataforma de eventos interactivos<br>
      Este es un email automático, no respondas a esta dirección.
    </div>
  </div>
</body>
</html>`, resetURL, resetURL)

	payload := map[string]interface{}{
		"from":    r.from,
		"to":      []string{email},
		"subject": "Recuperar contraseña — EventHub",
		"html":    htmlBody,
	}

	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("resend API error (status %d): %v", resp.StatusCode, errResp)
	}

	return nil
}
