# Feature Flags API

> Manage event feature flags dynamically.

> **Note:** Admin authentication uses JWT Bearer tokens. The legacy `?key=` query parameter is deprecated.

## Update Event Features

Update which features are enabled for an event.

```http
PUT /api/admin/events/:slug/features
```

### Authentication
Requires JWT Bearer token (Owner of the event).

### Request Body

```json
{
  "features": {
    "quiz": true,
    "corkboard": true,
    "secret_box": false
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `features.quiz` | boolean | Enable quiz feature |
| `features.corkboard` | boolean | Enable corkboard/postcards feature |
| `features.secret_box` | boolean | Enable secret box feature |

### Response

```json
{
  "id": "uuid",
  "slug": "mile-2026",
  "name": "Mile's Birthday 2026",
  "features": {
    "quiz": true,
    "corkboard": true,
    "secret_box": false
  },
  "created_at": "2026-03-17T10:00:00Z",
  "updated_at": "2026-03-17T10:00:00Z"
}
```

### Example

```bash
curl -X PUT "http://localhost:8081/api/admin/events/mile-2026/features" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "quiz": true,
      "corkboard": true,
      "secret_box": false
    }
  }'
```

### Error Responses

- `400` - Invalid feature keys
- `401` - Unauthorized (no token)
- `403` - Forbidden (not owner)
- `404` - Event not found

## Get Event Features

Event features are returned when fetching event details:

```http
GET /api/events/:slug
```

The response includes the `features` object with current settings.

## Event Response Contract (safe payloads)

The event payloads in the following responses use an explicit allowlist DTO
(`models.PublicEventResponse`) so that invitation and Secret Box credentials are not
included in generic event responses. Dedicated token endpoints remain the only
responses that return those credentials.

### Responses that use the safe payload

| Endpoint | Auth | Notes |
|----------|------|-------|
| `GET /api/events/:slug` | Public | Event detail for visitors |
| `GET /api/users/me/events` | JWT | Owned **and** collaborator events |
| `POST /api/collaborators/accept` | JWT | Joined event |
| `PUT /api/admin/events/:slug/features` | Owner or collaborator | Updated event |
| `POST /api/admin/events/:slug/media` | Owner or collaborator | Uploaded media and updated event |
| `DELETE /api/admin/events/:slug/media` | Owner or collaborator | Updated event |

### Fields included

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Event id |
| `slug` | string | URL slug |
| `owner_id` | uuid | Owner id |
| `name` | string | Event name |
| `description` | string | Event description |
| `features` | object | Feature flags (`quiz`, `corkboard`, `secretBox`) |
| `settings` | object | Theme settings (`theme`, `primary_color`, `background_image`, `logo_url`, `background_url`, `postcard_style`) |
| `starts_at` | datetime | Optional start date |
| `ends_at` | datetime | Optional end date |
| `is_active` | boolean | Whether the event is active |
| `created_at` | datetime | Creation timestamp |

### Fields never included

`invite_token` and `secret_box_token` are **never** returned by the endpoints above,
not even to the event owner or to collaborators.

### Where to obtain the tokens (authorized endpoints)

| Endpoint | Access | Returns |
|----------|--------|---------|
| `GET /api/admin/events/:slug/collaborators/invite` | Owner only | Invitation token (`token`, `share_url`) |
| `POST /api/admin/events/:slug/collaborators/invite` | Owner only | New invitation token (`token`, `share_url`) |
| `GET /api/admin/events/:slug/secret-box/token` | Owner or collaborator | Secret Box token (`token`, `share_url`) |
| `POST /api/admin/events/:slug/secret-box/token/regenerate` | Owner or collaborator | Rotated Secret Box token (`token`, `share_url`) |

Anonymous users get `401`; authenticated users without permission get `403`.

## Feature Defaults

When creating a new event, features default to:

```json
{
  "quiz": true,
  "corkboard": true,
  "secret_box": false
}
```
