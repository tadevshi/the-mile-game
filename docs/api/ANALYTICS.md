# Analytics API (Phase 3)

> Complete reference for event analytics and metrics endpoints.

## Overview

Analytics provides event organizers with insights about their event's performance:
- Page views and traffic patterns
- Quiz completion rates
- Postcard engagement
- Score distribution

## Endpoints

### Get Analytics Summary

```
GET /api/admin/events/:slug/analytics
Authorization: Bearer {jwt-token}
```

**Response:**

```json
{
  "data": {
    "summary": {
      "total_page_views": 156,
      "total_players": 23,
      "total_quiz_completions": 18,
      "total_postcards": 45,
      "avg_score": 7.2,
      "completion_rate": 78.2
    },
    "top_scores": [
      { "player_id": "uuid", "name": "Juan", "score": 10, "avatar": "🎨" },
      { "player_id": "uuid", "name": "María", "score": 9, "avatar": "🌟" }
    ]
  }
}
```

---

### Get Activity Timeline

```
GET /api/admin/events/:slug/analytics/timeline?period=hourly
Authorization: Bearer {jwt-token}
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | hourly | `hourly` or `daily` |
| `days` | number | 7 | Number of days to include |

**Response:**

```json
{
  "data": {
    "timeline": [
      { "timestamp": "2026-03-20T10:00:00Z", "views": 12, "players": 3 },
      { "timestamp": "2026-03-20T11:00:00Z", "views": 8, "players": 2 },
      { "timestamp": "2026-03-20T12:00:00Z", "views": 15, "players": 5 }
    ],
    "period": "hourly",
    "total_views": 156,
    "peak_hour": { "hour": 14, "views": 25 }
  }
}
```

---

### Get Conversion Funnel

```
GET /api/admin/events/:slug/analytics/funnel
Authorization: Bearer {jwt-token}
```

**Response:**

```json
{
  "data": {
    "funnel": {
      "visitors": 156,
      "registered": 45,
      "quiz_started": 35,
      "quiz_completed": 30,
      "postcards_sent": 20
    },
    "conversion_rates": {
      "visitor_to_registered": 28.8,
      "registered_to_completed": 66.7,
      "completed_to_postcard": 66.7
    }
  }
}
```

---

### Get Score Distribution

```
GET /api/admin/events/:slug/analytics/scores
Authorization: Bearer {jwt-token}
```

**Response:**

```json
{
  "data": {
    "distribution": [
      { "range": "0-2", "count": 2 },
      { "range": "2-4", "count": 3 },
      { "range": "4-6", "count": 5 },
      { "range": "6-8", "count": 8 },
      { "range": "8-10", "count": 4 }
    ],
    "stats": {
      "mean": 6.2,
      "median": 7.0,
      "mode": 8.0,
      "min": 1.0,
      "max": 10.0
    },
    "total_players": 22
  }
}
```

---

### Track Page View

```
POST /api/events/:slug/page-view
```

Public endpoint to track page views when guests visit the event.

**Request:**

```json
{
  "path": "/e/mile-2026",
  "user_agent": "Mozilla/5.0..."
}
```

**Response:**

```json
{
  "success": true
}
```

---

## Tracking Tables

Analytics data is stored in three tables:

### page_views

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `event_id` | UUID | Event reference |
| `viewed_at` | TIMESTAMP | When the view occurred |
| `path` | VARCHAR | URL path |
| `user_agent` | TEXT | Browser user agent |

### quiz_events

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `event_id` | UUID | Event reference |
| `player_id` | UUID | Player reference |
| `event_type` | VARCHAR | started, completed, abandoned |
| `occurred_at` | TIMESTAMP | When the event occurred |

### postcard_events

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `event_id` | UUID | Event reference |
| `postcard_id` | UUID | Postcard reference |
| `event_type` | VARCHAR | created, viewed, downloaded |
| `occurred_at` | TIMESTAMP | When the event occurred |

---

## Related Docs

- [Analytics Dashboard Flow](../../flows/eventhub-flows.md#4-admin-panel-del-evento)
- [Analytics Guide](../../guides/ANALYTICS.md)
