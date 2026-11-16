# API Documentation

> Complete reference for EventHub REST API.

## Base URL

```
Development: http://localhost:8080/api
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

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register user | No |
| POST | `/auth/login` | Login | No |
| POST | `/auth/refresh` | Refresh token | No |
| GET | `/auth/me` | Get current user | Yes |
| POST | `/auth/logout` | Logout | Yes |

### Events
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me/events` | Get user's events | Yes |
| POST | `/events` | Create new event | Yes |
| GET | `/events/:slug` | Get event by slug | Public: no; private: JWT event member |
| POST | `/events/:slug/page-view` | Track page view | Public: no; private: JWT event member |

### Current scoped event visibility

Current `/events/:slug/...` content and play routes remain anonymous for public events. For a private event they require a valid account JWT belonging to the event owner, a collaborator, or an accepted guest; missing/invalid identity returns `401`, and an authenticated non-member receives `403`. Guest membership permits event participation but does not grant administration. Invalid optional authentication does not change public-event access.

All supported event creation and administration paths continue to leave events public; this API does not yet expose a visibility-setting operation. Legacy unscoped endpoints retain their existing behavior and are not covered by this scoped policy. Do not activate private visibility until the later legacy, WebSocket, and media protections are available.

`POST /events/:slug/secret-box` remains a separate upload-only endpoint authorized by that event's `X-Secret-Token`; the token does not grant access to event content.

### Event Guests
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/events/:slug/guests/invite` | Get or create the event's guest-only invitation link | Yes (Owner or collaborator) |
| POST | `/admin/events/:slug/guests/invite` | Rotate the guest invitation link; existing memberships remain | Yes (Owner or collaborator) |
| GET | `/admin/events/:slug/guests` | List account-linked guest memberships | Yes (Owner or collaborator) |
| DELETE | `/admin/events/:slug/guests/:user_id` | Remove a guest membership without deleting the account | Yes (Owner or collaborator) |
| POST | `/guests/accept?token=...` | Accept a guest invitation (separate from collaborator invitations) | Yes |

The event guest link is separate from the collaborator invitation link. Guests may participate but do not receive event administration rights.

### Players
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/events/:slug/players` | Register player | Public: no; private: JWT event member |
| GET | `/events/:slug/players` | List players | Public: no; private: JWT event member |
| GET | `/events/:slug/players/:id` | Get player | Public: no; private: JWT event member |

### Quiz
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug/quiz/questions` | Get quiz questions | Public: no; private: JWT event member |
| POST | `/events/:slug/quiz/submit` | Submit quiz answers | Public: player ID; private: JWT event member and player ID |
| GET | `/events/:slug/quiz/answers/:playerId` | Get player answers | Public: no; private: JWT event member |

### Ranking
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug/ranking` | Get ranking | Public: no; private: JWT event member |

### Postcards (Corkboard) — Supports Images & Videos
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events/:slug/postcards` | List event postcards | Public: no; private: JWT event member |
| POST | `/events/:slug/postcards` | Create event postcard (image OR media) | Public: no; private: JWT event member |
| GET | `/postcards` | List postcards (legacy query: `event_id`) | Legacy; unchanged by scoped visibility |
| POST | `/postcards` | Create postcard (legacy) | Legacy; unchanged by scoped visibility |
| POST | `/events/:slug/secret-box` | Create secret postcard | `X-Secret-Token` for that event; upload only |

### Themes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/themes/presets` | List theme presets | No |
| GET | `/events/:slug/theme` | Get event theme | Public: no; private: JWT event member |
| PUT | `/admin/events/:slug/theme` | Update theme | Yes (Owner) |
| POST | `/admin/events/:slug/theme/preset` | Apply preset | Yes (Owner) |

### Admin Secret Box
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/events/:slug/secret-box` | List secret postcards | Yes (Owner) |
| POST | `/admin/events/:slug/reveal` | Reveal secret box | Yes (Owner) |
| GET | `/admin/events/:slug/secret-box/status` | Secret box status | Yes (Owner) |

### Admin Analytics (Phase 3)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/events/:slug/analytics` | Analytics summary | Yes (Owner) |
| GET | `/admin/events/:slug/analytics/timeline` | Activity timeline | Yes (Owner) |
| GET | `/admin/events/:slug/analytics/funnel` | Conversion funnel | Yes (Owner) |
| GET | `/admin/events/:slug/analytics/scores` | Score distribution | Yes (Owner) |

### Admin Quiz Questions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/events/:slug/questions` | List questions | Yes (Owner) |
| POST | `/admin/events/:slug/questions` | Create question | Yes (Owner) |
| PUT | `/admin/questions/:id` | Update question | Yes (Owner) |
| DELETE | `/admin/questions/:id` | Delete question | Yes (Owner) |
| PATCH | `/admin/events/:slug/questions/reorder` | Reorder questions | Yes (Owner) |
| GET | `/admin/events/:slug/questions/export` | Export questions | Yes (Owner) |
| POST | `/admin/events/:slug/questions/import` | Import questions | Yes (Owner) |

### Admin Features
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | `/admin/events/:slug/features` | Update features | Yes (Owner) |

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-20T10:00:00Z"
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

## Media Upload

### Image Postcards
```
POST /api/postcards
Content-Type: multipart/form-data

image: [file]
message: "Happy birthday!"
event_id: "uuid"
player_id: "uuid"
```

**Limits:**
- Formats: JPEG, PNG, WebP
- Max size: 10MB

### Video Postcards (Phase 3)
```
POST /api/postcards
Content-Type: multipart/form-data

media: [file]
message: "Best wishes!"
event_id: "uuid"
player_id: "uuid"
```

**Limits:**
- Formats: MP4, WebM, MOV
- Max size: 50MB
- Max duration: 30 seconds
- Backend generates thumbnail via ffmpeg

**Response:**
```json
{
  "id": "uuid",
  "image_path": "/uploads/videos/xxx.mp4",
  "thumbnail_path": "/uploads/thumbnails/xxx.jpg",
  "media_type": "video",
  "media_duration_ms": 15000,
  "rotation": -5.2,
  "message": "Best wishes!",
  "sender_name": null,
  "is_secret": false
}
```

## Detailed Endpoint Docs

- [Authentication](AUTH.md) - Login, register, tokens
- [Themes](THEMES.md) - Theme customization
- [Quiz](QUIZ.md) - Quiz and questions endpoints
- [Questions](QUESTIONS.md) - Question Editor API
- [Postcards](POSTCARDS.md) - Corkboard postcards (images & videos)
- [Analytics](ANALYTICS.md) - Event analytics & metrics
- [Features](FEATURES.md) - Feature flags management

## WebSocket

Real-time updates via WebSocket:

```
ws://localhost:8080/ws?event={event-slug}
```

Events:
- `ranking_update` - Ranking changed
- `new_postcard` - New postcard created
- `secret_box_reveal` - Secret box revealed (broadcasts hidden postcards)

## SDK / Client Libraries

### JavaScript/TypeScript

```typescript
import { api } from '@/shared/lib/api';

// GET request
const theme = await api.getEventBySlug(slug);

// POST request (player registration)
const player = await api.createPlayer(slug, { name: 'John Doe' });

// Upload postcard
const formData = new FormData();
formData.append('image', file);
formData.append('message', 'Happy birthday!');
await api.createPostcard(formData);
```

See [Frontend Architecture](../../AGENTS.md#frontend) for more details.

## Testing

Use the Postman collection or test with curl:

```bash
# Get theme
curl http://localhost:8080/api/events/mile-2026/theme

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## Changelog

### v3.0.0 (Phase 3 - Growth & Polish)
- Added Analytics API endpoints
- Added video postcard support (media_type, thumbnail_path, media_duration_ms)
- Added page view tracking endpoint
- Added ffmpeg thumbnail generation for videos
- Added i18n support (ES/EN)

### v2.0.0 (Phase 2)
- Added Theme API
- Added Admin endpoints for theme management
- Multi-event support

### v1.0.0 (Phase 1)
- Initial API release
- Quiz, Ranking, Postcards
