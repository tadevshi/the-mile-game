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

All supported event creation and administration paths continue to leave events public; this API does not yet expose a visibility-setting operation. Legacy unscoped endpoints are not covered by this scoped policy; they follow the legacy visibility and legacy administration rules below. Do not activate private visibility until the later WebSocket and media protections are available — private-event protection is not complete yet.

`POST /events/:slug/secret-box` remains a separate upload-only endpoint authorized by that event's `X-Secret-Token`; the token does not grant access to event content.

### Legacy (unscoped) event visibility

The legacy, non-event-scoped routes resolve the event that owns each record and apply the persisted event visibility, with the same semantics as the scoped routes above. A record that belongs to a public event stays readable by anyone, including anonymous callers. A record that belongs to a private event is readable only by the event owner, its collaborators and its accepted guests.

| Method | Endpoint | Visibility |
|--------|----------|------------|
| GET | `/players/:id` | Resolves the player's event; public: no auth; private: JWT event member |
| GET | `/players` | Lists only the rows of the events the caller may see |
| GET | `/ranking` | Lists only the entries of the events the caller may see |
| GET | `/quiz/answers/:playerId` | Resolves the player's event; public: no auth; private: JWT event member |
| GET | `/quiz/descriptions` | Returns only the descriptions of the events the caller may see |
| GET | `/postcards` | Lists only the postcards of the events the caller may see |
| POST | `/quiz/submit` | Denied before anything is stored when the referenced player belongs to a private event the caller may not see |
| POST | `/postcards` | Denied before anything is stored when the referenced player belongs to a private event the caller may not see; a stored postcard keeps the event of its player |

The denial semantics match the scoped routes:

- `401` with `Authentication required` when the request carries no valid account identity.
- `403` with `Not authorized to view this event` when the request carries a valid identity but the caller is not an owner, collaborator or accepted guest of the event.

The legacy list routes filter out the rows the caller may not see and keep their status code and response shape. Legacy records that belong to no event keep their current behavior.

The legacy routes accept an optional bearer token. An absent, malformed or invalid token never changes access to a public event.

### Legacy administration

The legacy administration routes now require an authenticated account and are bounded to the events the caller administers.

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/admin/status` | Yes (owner or collaborator of at least one event) |
| GET | `/admin/secret-box` | Yes (owner or collaborator of at least one event) |
| POST | `/admin/reveal` | Yes (owner or collaborator of at least one event) |

- `401` with `Authentication required` when the request carries no valid account identity.
- `403` with `Not authorized. You are not the owner or a collaborator of this event` when the caller administers no event. Accepted guests are not collaborators, so a guest never gains administrative access.

The routes aggregate, list and reveal only over the events the caller owns or collaborates on. `POST /admin/reveal` reveals each of those events separately and broadcasts every affected event to its own room, addressed by event slug, instead of a single global broadcast; an event with no pending postcards is neither revealed nor broadcast.

Private-event protection is still incomplete. There is no supported administration write that can switch an event to private (`EventRepository.Update` does not persist `is_public`), and the WebSocket admission, global recipient isolation and media/cache protections are separate later units.

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
| GET | `/postcards` | List postcards (legacy route, no event filter in the query) | Legacy; filtered by event visibility |
| POST | `/postcards` | Create postcard (legacy) | Legacy; denied for private events the caller may not see; stored bound to the event of its player |
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

### WebSocket admission

The socket applies the same event visibility as the HTTP routes. The room is the `event` query parameter, and the client is admitted before the upgrade:

| Situation | Answer |
|-----------|--------|
| Public event, no identity | Admitted |
| Private event, no identity | `401` `Authentication required` |
| Private event, identity that is not a member | `403` `Not authorized to view this event` |
| Unknown or inactive event | `404` |

A private room needs an admission ticket. The browser requests it over the authenticated HTTP surface and offers it as a WebSocket subprotocol; the API JWT is never placed in the WebSocket URL.

```
POST /api/ws/ticket          # authenticated
{"event": "<event-slug>"}
```

```
201 {"ticket": "<signed value>", "expires_at": "<RFC3339>", "protocol": "eventhub.v1"}
```

The ticket is bound to the account and to that event, and it expires about a minute after it is minted, so the client requests a fresh one for every connection attempt. A ticket minted for another event does not open that room, but it also does not close a public room, which stays open to everyone. A ticket that does not validate leaves the client anonymous, which never grants access to a private room.

The ticket is a short-lived bearer credential: whoever holds it can use it as that account until it expires. The short lifetime, the subprotocol transport and the fact that the ticket is only minted for an event the account may reach bound that risk.

Clients offer two subprotocols: `eventhub.v1` and `ticket.<ticket value>`. The server negotiates `eventhub.v1`.

### Delivery

A client admitted to a room receives only the messages of that room. The global broadcasts reach only the connections without a room, and a room broadcast without an event slug reaches nobody. Those observers have no identity, so the global payload carries only what anybody may see: the public events and the records that belong to no event. A ranking, postcard or secret reveal of a private event never reaches them. The global recipient filtering for the observers is therefore complete; the legacy call sites still publish globally, so the legacy updates of a private event are not delivered over a socket.

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
