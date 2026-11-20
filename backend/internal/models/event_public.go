package models

import (
	"time"

	"github.com/google/uuid"
)

// PublicEventResponse es el DTO de respuesta de evento con allowlist explícita.
// Se usa en detalle público, listados autenticados, mutaciones administrativas
// genéricas y aceptación de invitaciones; ningún payload genérico lleva tokens.
//
// Los tokens de invitación (invite_token) y de Secret Box (secret_box_token)
// NO forman parte de esta allowlist. Solo se obtienen por los endpoints de
// administración autorizados:
//
//	GET  /api/admin/events/:slug/collaborators/invite  (solo owner)
//	GET  /api/admin/events/:slug/secret-box/token      (owner o colaborador)
//
// Importante: el modelo Event conserva sus tags JSON de persistencia. El
// filtrado de credenciales vive únicamente en este DTO, nunca en el modelo.
type PublicEventResponse struct {
	ID          uuid.UUID     `json:"id"`
	Slug        string        `json:"slug"`
	OwnerID     uuid.UUID     `json:"owner_id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Features    EventFeatures `json:"features"`
	Settings    EventSettings `json:"settings"`
	StartsAt    *time.Time    `json:"starts_at,omitempty"`
	EndsAt      *time.Time    `json:"ends_at,omitempty"`
	IsActive    bool          `json:"is_active"`
	CreatedAt   time.Time     `json:"created_at"`
}

// NewPublicEventResponse construye una respuesta de evento sin credenciales.
// Devuelve nil si el evento es nil.
func NewPublicEventResponse(event *Event) *PublicEventResponse {
	if event == nil {
		return nil
	}

	return &PublicEventResponse{
		ID:          event.ID,
		Slug:        event.Slug,
		OwnerID:     event.OwnerID,
		Name:        event.Name,
		Description: event.Description,
		Features:    event.Features,
		Settings:    event.Settings,
		StartsAt:    event.StartsAt,
		EndsAt:      event.EndsAt,
		IsActive:    event.IsActive,
		CreatedAt:   event.CreatedAt,
	}
}

// AdminEventResponse es el DTO de respuesta de evento para la administración.
// Reune los mismos campos de la respuesta pública y agrega la visibilidad
// persistida del evento.
//
// La visibilidad se expone solo por esta via: el DTO publico es una
// allowlist y un cliente anonimo nunca debe aprender si un evento es privado.
type AdminEventResponse struct {
	PublicEventResponse
	IsPublic bool `json:"is_public"`
}

// NewAdminEventResponse construye la respuesta administrativa de un evento.
// Devuelve nil si el evento es nil.
func NewAdminEventResponse(event *Event) *AdminEventResponse {
	if event == nil {
		return nil
	}

	public := NewPublicEventResponse(event)
	if public == nil {
		return nil
	}

	return &AdminEventResponse{
		PublicEventResponse: *public,
		IsPublic:            event.IsPublic,
	}
}

// NewPublicEventResponses construye la respuesta pública para un listado de
// eventos. Siempre devuelve un slice no nulo (JSON `[]` y no `null`).
func NewPublicEventResponses(events []Event) []PublicEventResponse {
	responses := make([]PublicEventResponse, 0, len(events))

	for i := range events {
		response := NewPublicEventResponse(&events[i])
		if response == nil {
			continue
		}
		responses = append(responses, *response)
	}

	return responses
}
