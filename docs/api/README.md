# API Documentation

> Complete reference for The Mile Game REST API.

## Base URL

```
Development: http://localhost:8081/api
Production: https://your-domain.com/api
```

## Authentication

Most endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer {your-jwt-token}
```

See [Authentication](AUTH.md) for details on obtaining tokens.

> **Note:** The legacy authentication system using `X-Admin-Key` headers and `?key=` query 
> parameters has been deprecated. All admin endpoints now require JWT authentication. Event 
> owners can manage their events after logging in via `/auth/login`.

## Endpoints Overview

### Events
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug` | Get event details | No |
| GET | `/events/:slug/theme` | Get event theme | No |
| POST | `/events` | Create new event | Yes |
| PUT | `/events/:id` | Update event | Yes (Owner) |

### Players
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/events/:slug/players` | Register player | No |
| GET | `/events/:slug/players` | List players | No |
| GET | `/players/:id` | Get player details | No |

### Quiz
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug/quiz/questions` | Get quiz questions | No |
| POST | `/events/:slug/quiz/submit` | Submit quiz answers | Yes (Player) |
| GET | `/events/:slug/quiz/answers/:playerId` | Get player answers | Yes (Player) |

### Ranking
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug/ranking` | Get ranking | No |

### Postcards (Corkboard)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug/postcards` | List postcards | No |
| POST | `/events/:slug/postcards` | Create postcard | Yes (Player) |

### Themes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/themes/presets` | List theme presets | No |
| GET | `/events/:slug/theme` | Get event theme | No |
| PUT | `/admin/events/:id/theme` | Update theme | Yes (Owner) |
| POST | `/admin/events/:id/theme/preset` | Apply preset | Yes (Owner) |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/events/:slug/status` | Secret box status | Yes (Owner) |
| GET | `/admin/events/:slug/secret-box` | List secret postcards | Yes (Owner) |
| POST | `/admin/events/:slug/reveal` | Reveal secret box | Yes (Owner) |
| PUT | `/admin/events/:slug/features` | Update event features | Yes (Owner) |

### Question Editor (Quiz Questions)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/events/:slug/questions` | List questions | Yes (Owner) |
| POST | `/admin/events/:slug/questions` | Create question | Yes (Owner) |
| PUT | `/admin/questions/:id` | Update question | Yes (Owner) |
| DELETE | `/admin/questions/:id` | Delete question | Yes (Owner) |
| PATCH | `/admin/events/:slug/questions/reorder` | Reorder questions | Yes (Owner) |
| GET | `/admin/events/:slug/questions/export` | Export questions | Yes (Owner) |
| POST | `/admin/events/:slug/questions/import` | Import questions | Yes (Owner) |

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register user | No |
| POST | `/auth/login` | Login | No |
| POST | `/auth/refresh` | Refresh token | No |
| GET | `/auth/me` | Get current user | Yes |
| POST | `/auth/logout` | Logout | Yes |

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-17T10:00:00Z"
  }
}
```

Or for simple endpoints:

```json
{
  "success": true,
  "theme": { ... }
}
```

### Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## Detailed Endpoint Docs

- [Authentication](AUTH.md) - Login, register, tokens
- [Events](EVENTS.md) - Event management
- [Themes](THEMES.md) - Theme customization
- [Quiz](QUIZ.md) - Quiz and questions endpoints
- [Questions](QUESTIONS.md) - Question Editor API
- [Postcards](POSTCARDS.md) - Corkboard postcards
- [Features](FEATURES.md) - Feature flags management

## WebSocket

Real-time updates via WebSocket:

```
ws://localhost:8081/ws?event={event-slug}
```

Events:
- `ranking_update` - Ranking changed
- `new_postcard` - New postcard created
- `secret_box_reveal` - Secret box revealed

## SDK / Client Libraries

### JavaScript/TypeScript

```typescript
import { api } from '@/shared/lib/api';

// GET request
const theme = await api.get(`/events/${slug}/theme`);

// POST request
const player = await api.post(`/events/${slug}/players`, {
  name: 'John Doe'
});
```

See [Frontend Architecture](../../AGENTS.md#frontend) for more details.

## Testing

Use the Postman collection or test with curl:

```bash
# Get theme
curl http://localhost:8081/api/events/mile-2026/theme

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## Changelog

### v2.0.0 (Phase 2)
- Added Theme API
- Added Admin endpoints for theme management
- Multi-event support

### v1.0.0 (Phase 1)
- Initial API release
- Quiz, Ranking, Postcards
