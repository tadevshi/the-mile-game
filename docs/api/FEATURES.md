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
included in generic event responses. The internal `is_public` field is also omitted.
Dedicated token endpoints remain the only responses that return those credentials.

Current event-scoped content routes remain anonymous for public events. A private event
requires a valid account JWT for its owner, a collaborator, or an accepted guest; guests
may participate but do not receive administration rights. Missing/invalid identity
returns `401`, while an authenticated non-member receives `403`. All supported event
creation and administration paths still leave events public, and this API has no
visibility-setting operation yet. Legacy unscoped routes follow the legacy rules below;
do not activate private visibility until the later WebSocket and media protections are
in place.

### Responses that use the safe payload

| Endpoint | Auth | Notes |
|----------|------|-------|
| `GET /api/events/:slug` | Public event: no; private event: JWT event member | Event detail for visitors |
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
not even to the event owner or to collaborators. The separate guest invitation token is
also omitted from generic event responses and is available only through its dedicated
admin endpoint below.

### Where to obtain the tokens (authorized endpoints)

| Endpoint | Access | Returns |
|----------|--------|---------|
| `GET /api/admin/events/:slug/collaborators/invite` | Owner only | Invitation token (`token`, `share_url`) |
| `POST /api/admin/events/:slug/collaborators/invite` | Owner only | New invitation token (`token`, `share_url`) |
| `GET /api/admin/events/:slug/guests/invite` | Owner or collaborator | Guest invitation token (`token`, `share_url`) |
| `POST /api/admin/events/:slug/guests/invite` | Owner or collaborator | Rotated guest invitation token (`token`, `share_url`); existing guest memberships remain |
| `GET /api/admin/events/:slug/secret-box/token` | Owner or collaborator | Secret Box token (`token`, `share_url`) |
| `POST /api/admin/events/:slug/secret-box/token/regenerate` | Owner or collaborator | Rotated Secret Box token (`token`, `share_url`) |

`POST /api/guests/accept?token=...` requires JWT authentication and returns only a success message plus event/user IDs; it never returns a token. Guest acceptance is separate from collaborator acceptance.

Anonymous users get `401`; authenticated users without permission get `403`.

## Legacy (unscoped) event visibility

The legacy, non-event-scoped routes resolve the event that owns each record and apply
the persisted event visibility, with the same semantics as the scoped routes.

| Method | Endpoint | Visibility |
|--------|----------|------------|
| GET | `/api/players/:id` | Resolves the player's event; public: no auth; private: JWT event member |
| GET | `/api/players` | Lists only the rows of the events the caller may see |
| GET | `/api/ranking` | Lists only the entries of the events the caller may see |
| GET | `/api/quiz/answers/:playerId` | Resolves the player's event; public: no auth; private: JWT event member |
| GET | `/api/quiz/descriptions` | Returns only the descriptions of the events the caller may see |
| GET | `/api/postcards` | Lists only the postcards of the events the caller may see |
| POST | `/api/quiz/submit` | Denied before anything is stored when the referenced player belongs to a private event the caller may not see |
| POST | `/api/postcards` | Denied before anything is stored when the referenced player belongs to a private event the caller may not see; a stored postcard keeps the event of its player |

A record that belongs to a public event stays readable by anyone, including anonymous
callers. A record that belongs to a private event is readable only by the event owner,
its collaborators and its accepted guests. The denial semantics match the scoped routes:
`401` with `Authentication required` without a valid account identity, and `403` with
`Not authorized to view this event` for an authenticated non-member.

The legacy list routes filter out the rows the caller may not see and keep their status
code and response shape. Legacy records that belong to no event keep their current
behavior. The legacy routes accept an optional bearer token: an absent, malformed or
invalid token never changes access to a public event.

## Legacy administration

The legacy administration routes require an authenticated account and are bounded to the
events the caller administers.

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/admin/status` | Yes (owner or collaborator of at least one event) |
| GET | `/api/admin/secret-box` | Yes (owner or collaborator of at least one event) |
| POST | `/api/admin/reveal` | Yes (owner or collaborator of at least one event) |

`401` with `Authentication required` is returned without a valid account identity, and
`403` with `Not authorized. You are not the owner or a collaborator of this event` when
the caller administers no event. Accepted guests are not collaborators, so a guest never
gains administrative access. The routes aggregate, list and reveal only over the events
the caller owns or collaborates on, and the reveal broadcasts every affected event to
its own room, addressed by event slug, instead of a single global broadcast.

Private-event protection is still incomplete: there is no supported administration write
that can switch an event to private (`EventRepository.Update` does not persist
`is_public`), and the WebSocket admission, global recipient isolation and media/cache
protections are separate later units.

## Feature Defaults

When creating a new event, features default to:

```json
{
  "quiz": true,
  "corkboard": true,
  "secret_box": false
}
```
