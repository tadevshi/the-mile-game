# Postcards API

> Complete reference for corkboard postcards, including video support (Phase 3).

## Overview

Postcards are photos or videos shared by guests on the corkboard. The API supports both **images** and **videos** with automatic thumbnail generation.

## Media Types

| Type | Field | Formats | Max Size |
|------|-------|---------|----------|
| Image | `image` | JPEG, PNG, WebP | 10MB |
| Video | `media` | MP4, WebM, MOV | 50MB |

## Endpoints

### List Postcards

```
GET /api/postcards?event_id={event-uuid}
```

### Response

```json
{
  "postcards": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "player_id": "uuid",
      "image_path": "/uploads/postcards/xxx.jpg",
      "thumbnail_path": null,
      "media_type": "image",
      "media_duration_ms": null,
      "rotation": -3.5,
      "message": "Happy birthday!",
      "sender_name": null,
      "is_secret": false,
      "revealed_at": null,
      "created_at": "2026-03-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "event_id": "uuid",
      "player_id": null,
      "image_path": "/uploads/videos/xxx.mp4",
      "thumbnail_path": "/uploads/thumbnails/xxx.jpg",
      "media_type": "video",
      "media_duration_ms": 15000,
      "rotation": 5.2,
      "message": "Best wishes!",
      "sender_name": "Tío Juan",
      "is_secret": true,
      "revealed_at": null,
      "created_at": "2026-03-20T10:00:00Z"
    }
  ]
}
```

---

### Create Postcard (Image)

```
POST /api/postcards
Content-Type: multipart/form-data
Authorization: Bearer {player-token}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes* | Image file (JPEG/PNG/WebP) |
| `media` | file | Yes* | Video file (MP4/WebM/MOV) |
| `event_id` | string | Yes | Event UUID |
| `player_id` | string | No | Player UUID (for ranking attribution) |
| `message` | string | No | Message on the postcard |

*Either `image` OR `media` is required, not both.

**Example:**

```bash
curl -X POST http://localhost:8080/api/postcards \
  -H "Authorization: Bearer {player-token}" \
  -F "image=@photo.jpg" \
  -F "event_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "message=Happy birthday!"
```

**Response:**

```json
{
  "id": "new-uuid",
  "image_path": "/uploads/postcards/new-photo.jpg",
  "thumbnail_path": null,
  "media_type": "image",
  "media_duration_ms": null,
  "rotation": -2.1,
  "message": "Happy birthday!",
  "sender_name": null,
  "is_secret": false,
  "created_at": "2026-03-20T10:00:00Z"
}
```

---

### Create Postcard (Video)

```
POST /api/postcards
Content-Type: multipart/form-data
Authorization: Bearer {player-token}
```

**Video Processing (Backend):**

1. Validates file by magic bytes (not extension)
2. Saves video to `/uploads/videos/`
3. Generates thumbnail at 1 second mark via ffmpeg
4. Extracts duration via ffprobe
5. Assigns random rotation (-30° to +30°)
6. Saves to database

**Example:**

```bash
curl -X POST http://localhost:8080/api/postcards \
  -H "Authorization: Bearer {player-token}" \
  -F "media=@video.mp4" \
  -F "event_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "message=Best wishes from abroad!"
```

**Response:**

```json
{
  "id": "new-uuid",
  "image_path": "/uploads/videos/new-video.mp4",
  "thumbnail_path": "/uploads/thumbnails/new-video.jpg",
  "media_type": "video",
  "media_duration_ms": 15000,
  "rotation": 5.2,
  "message": "Best wishes from abroad!",
  "sender_name": null,
  "is_secret": false,
  "created_at": "2026-03-20T10:00:00Z"
}
```

---

### Create Secret Postcard

```
POST /api/events/:slug/secret-box
Content-Type: multipart/form-data
X-Secret-Token: {EVENT_SECRET_BOX_TOKEN}
```

Secret postcards are hidden until the admin reveals them via WebSocket.

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `media` OR `image` | file | Yes | Media file |
| `sender_name` | string | Yes | Name of the sender |
| `message` | string | No | Message |

**Example:**

```bash
curl -X POST http://localhost:8080/api/events/ale-roy/secret-box \
  -H "X-Secret-Token: {EVENT_SECRET_BOX_TOKEN}" \
  -F "image=@surprise.jpg" \
  -F "sender_name=Tío Juan" \
  -F "message=I couldn't make it but wanted to say..."
```

**Response:**

```json
{
  "id": "new-uuid",
  "image_path": "/uploads/postcards/surprise.jpg",
  "thumbnail_path": null,
  "media_type": "image",
  "media_duration_ms": null,
  "rotation": -8.3,
  "message": "I couldn't make it but wanted to say...",
  "sender_name": "Tío Juan",
  "is_secret": true,
  "revealed_at": null,
  "created_at": "2026-03-20T10:00:00Z"
}
```

**Note:** Secret postcards are NOT broadcast via WebSocket until revealed.

---

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `event_id` | UUID | Foreign key to events |
| `player_id` | UUID? | Foreign key to players (nullable for secrets) |
| `image_path` | string | Path to media file |
| `thumbnail_path` | string? | Path to video thumbnail (images: null) |
| `media_type` | string | "image" or "video" |
| `media_duration_ms` | int? | Video duration in milliseconds (images: null) |
| `rotation` | decimal | Random rotation angle (-30 to +30) |
| `message` | string? | Message on the postcard |
| `sender_name` | string? | Name of secret postcard sender |
| `is_secret` | boolean | Hidden until reveal |
| `revealed_at` | timestamp? | When the secret was revealed |

---

## Validation

### Image Validation
- Magic bytes checked: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`52 49 46 46 ... 57 45 42 50`)
- Max size: 10MB

### Video Validation
- Magic bytes checked: MP4 (`66 74 79 70`), WebM (`1A 45 DF A3`), MOV (`66 72 65 65` or `6D 6F 6F 76`)
- Max size: 50MB
- Backend validates duration ≤ 30 seconds

---

## Related Docs

- [Secret Box Flow](../../flows/eventhub-flows.md#7-secret-box---sorpresa-para-festejado)
- [Video Processing](README.md#media-upload)
