# Feature Flags API

Manage event feature flags dynamically.

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

## Feature Defaults

When creating a new event, features default to:

```json
{
  "quiz": true,
  "corkboard": true,
  "secret_box": false
}
```
