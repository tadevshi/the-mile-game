# Question Editor API

> Complete API reference for managing quiz questions via the admin interface.

> **Note:** Admin authentication uses JWT Bearer tokens. The legacy `?key=` query parameter is deprecated.

## Authentication

All Question Editor endpoints require JWT Bearer token authentication:

```
GET /api/admin/events/:slug/questions
Authorization: Bearer {your-jwt-token}
```

The user must be the owner of the event.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/events/:slug/questions` | List all questions |
| POST | `/admin/events/:slug/questions` | Create a new question |
| PUT | `/admin/questions/:id` | Update a question |
| DELETE | `/admin/questions/:id` | Delete a question |
| PATCH | `/admin/events/:slug/questions/reorder` | Reorder questions |
| GET | `/admin/events/:slug/questions/export` | Export questions to JSON |
| POST | `/admin/events/:slug/questions/import` | Import questions from JSON |

---

## List Questions

Retrieve all questions for an event, optionally filtered by section.

```
GET /api/admin/events/:slug/questions
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `section` | string | No | Filter by section: `favorites`, `preferences`, or `description` |
| `page` | number | No | Page number (default: 1) |
| `per_page` | number | No | Items per page (default: 50, max: 100) |

### Example Request

```bash
curl -X GET "http://localhost:8081/api/admin/events/mile-2026/questions?section=favorites" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Response

```json
{
  "questions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event_id": "550e8400-e29b-41d4-a716-446655440001",
      "key": "favorite_color",
      "type": "text",
      "section": "favorites",
      "data": {
        "question": "¿Cuál es tu color favorito?",
        "options": null,
        "correct_answers": ["azul", "blue"]
      },
      "sort_order": 1,
      "is_scorable": true,
      "created_at": "2026-03-17T10:00:00Z",
      "updated_at": "2026-03-17T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 10
  }
}
```

---

## Create Question

Create a new quiz question.

```
POST /api/admin/events/:slug/questions
```

### Request Body

```json
{
  "key": "favorite_color",
  "type": "text",
  "section": "favorites",
  "question_text": "¿Cuál es tu color favorito?",
  "correct_answers": ["azul", "blue"],
  "sort_order": 1,
  "is_scorable": true
}
```

### Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Unique identifier for the question (unique per event). Use snake_case: `favorite_color`, `coffee_or_tea` |
| `type` | string | Yes | Question type: `text`, `choice`, or `boolean` |
| `section` | string | Yes | Section grouping: `favorites`, `preferences`, or `description` |
| `question_text` | string | Yes | The question text displayed to players |
| `correct_answers` | array | No | Array of acceptable correct answers (case-insensitive matching) |
| `options` | array | No | Options for `choice` type questions: `["Option A", "Option B"]` |
| `sort_order` | number | No | Display order (auto-assigned if not provided) |
| `is_scorable` | boolean | No | Whether this question contributes to the score (default: true) |

### Example: Text Question

```bash
curl -X POST "http://localhost:8081/api/admin/events/mile-2026/questions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "favorite_color",
    "type": "text",
    "section": "favorites",
    "question_text": "¿Cuál es tu color favorito?",
    "correct_answers": ["azul", "blue", "rosa"],
    "is_scorable": true
  }'
```

### Example: Choice Question

```bash
curl -X POST "http://localhost:8081/api/admin/events/mile-2026/questions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "coffee_or_tea",
    "type": "choice",
    "section": "preferences",
    "question_text": "¿Café o Té?",
    "options": ["Café", "Té"],
    "correct_answers": ["Café"],
    "is_scorable": true
  }'
```

### Example: Description Question (Non-scorable)

```bash
curl -X POST "http://localhost:8081/api/admin/events/mile-2026/questions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "describe_mile",
    "type": "text",
    "section": "description",
    "question_text": "Descríbeme en una oración",
    "correct_answers": [],
    "is_scorable": false
  }'
```

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440001",
  "key": "favorite_color",
  "type": "text",
  "section": "favorites",
  "data": {
    "question": "¿Cuál es tu color favorito?",
    "options": null,
    "correct_answers": ["azul", "blue", "rosa"]
  },
  "sort_order": 1,
  "is_scorable": true,
  "created_at": "2026-03-17T10:00:00Z",
  "updated_at": "2026-03-17T10:00:00Z"
}
```

### Error Responses

**Duplicate Key (400)**

```json
{
  "error": "Question key already exists for this event"
}
```

**Invalid JSON (400)**

```json
{
  "error": "Invalid JSON: expected } at position 42"
}
```

---

## Update Question

Update an existing question.

```
PUT /api/admin/questions/:id
```

### Request Body

All fields are optional. Only provided fields will be updated.

```json
{
  "key": "new_key",
  "question_text": "Updated question text",
  "correct_answers": ["new", "answers"],
  "is_scorable": false
}
```

### Example Request

```bash
curl -X PUT "http://localhost:8081/api/admin/questions/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "¿Cuál es TU color favorito?",
    "correct_answers": ["rosa", "rosado"]
  }'
```

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440001",
  "key": "favorite_color",
  "type": "text",
  "section": "favorites",
  "data": {
    "question": "¿Cuál es TU color favorito?",
    "options": null,
    "correct_answers": ["rosa", "rosado"]
  },
  "sort_order": 1,
  "is_scorable": true,
  "created_at": "2026-03-17T10:00:00Z",
  "updated_at": "2026-03-17T11:00:00Z"
}
```

---

## Delete Question

Delete a question permanently.

```
DELETE /api/admin/questions/:id
```

### Example Request

```bash
curl -X DELETE "http://localhost:8081/api/admin/questions/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {token}"
```

### Response

```json
{
  "message": "Question deleted successfully"
}
```

### Error Responses

**Not Found (404)**

```json
{
  "error": "Question not found"
}
```

---

## Reorder Questions

Update the sort order of multiple questions at once.

```
PATCH /api/admin/events/:slug/questions/reorder
```

### Request Body

```json
[
  { "id": "uuid-1", "sort_order": 1 },
  { "id": "uuid-2", "sort_order": 2 },
  { "id": "uuid-3", "sort_order": 3 }
]
```

### Example Request

```bash
curl -X PATCH "http://localhost:8081/api/admin/events/mile-2026/questions/reorder" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '[
    { "id": "550e8400-e29b-41d4-a716-446655440001", "sort_order": 2 },
    { "id": "550e8400-e29b-41d4-a716-446655440002", "sort_order": 1 },
    { "id": "550e8400-e29b-41d4-a716-446655440003", "sort_order": 3 }
  ]'
```

### Response

```json
{
  "message": "Questions reordered successfully"
}
```

### Validation

- All question IDs must belong to the specified event
- Sort order values should be sequential integers starting from 1

---

## Export Questions

Export all questions to JSON format (useful for backup or copying to another event).

```
GET /api/admin/events/:slug/questions/export
```

### Example Request

```bash
curl -X GET "http://localhost:8081/api/admin/events/mile-2026/questions/export" \
  -H "Authorization: Bearer {token}"
```

### Response

```json
{
  "event": "Mile's Birthday Party",
  "questions": [
    {
      "section": "favorites",
      "key": "favorite_color",
      "question_text": "¿Cuál es tu color favorito?",
      "correct_answers": ["azul", "blue", "rosa"],
      "options": null,
      "sort_order": 1,
      "is_scorable": true
    },
    {
      "section": "preferences",
      "key": "coffee_or_tea",
      "question_text": "¿Café o Té?",
      "correct_answers": ["Café"],
      "options": ["Café", "Té"],
      "sort_order": 2,
      "is_scorable": true
    }
  ]
}
```

### Note

Exported questions do not include `id` or `event_id` fields, making them suitable for import into a different event.

---

## Import Questions

Import questions from JSON. Validates that keys don't already exist in the target event.

```
POST /api/admin/events/:slug/questions/import
```

### Request Body

```json
{
  "questions": [
    {
      "section": "favorites",
      "key": "imported_color",
      "question_text": "¿Cuál es tu color favorito?",
      "correct_answers": ["azul"],
      "options": null,
      "sort_order": 0,
      "is_scorable": true
    }
  ]
}
```

> **Note**: `sort_order: 0` means "auto-assign next available order"

### Example Request

```bash
curl -X POST "http://localhost:8081/api/admin/events/mile-2026/questions/import" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "section": "favorites",
        "key": "imported_question",
        "question_text": "Imported question",
        "correct_answers": ["answer"],
        "sort_order": 0,
        "is_scorable": true
      }
    ]
  }'
```

### Response (Success)

```json
{
  "imported": 1,
  "questions": [
    {
      "id": "new-uuid",
      "key": "imported_question",
      ...
    }
  ],
  "warnings": []
}
```

### Response (Partial Success with Warnings)

```json
{
  "imported": 2,
  "questions": [...],
  "warnings": [
    "Question 3: key 'duplicate_key' already exists"
  ]
}
```

### Response (Complete Failure)

```json
{
  "error": "Failed to import any questions",
  "errors": [
    "Question 1: missing required fields",
    "Question 2: key 'existing_key' already exists"
  ],
  "imported": 0
}
```

### Import Rules

- Questions with duplicate keys are skipped
- Missing required fields (`section`, `key`, `question_text`) cause the question to be skipped
- Successfully imported questions are created in the database
- Warnings are returned for skipped questions but don't fail the entire import

---

## Question Types

### Text Questions

For open-ended answers. Players type their response.

```json
{
  "key": "favorite_movie",
  "type": "text",
  "section": "favorites",
  "question_text": "¿Cuál es tu película de Disney favorita?",
  "correct_answers": ["frozen", "rapunzel", "moana", "bajo"],
  "is_scorable": true
}
```

The system will normalize player input (lowercase, trim whitespace) and check against any of the correct answers.

### Choice Questions

For "this or that" style questions. Players select one option.

```json
{
  "key": "coffee_or_tea",
  "type": "choice",
  "section": "preferences",
  "question_text": "¿Café o Té?",
  "options": ["Café", "Té"],
  "correct_answers": ["Café"],
  "is_scorable": true
}
```

### Boolean Questions

For yes/no questions.

```json
{
  "key": "likes_pizza",
  "type": "boolean",
  "section": "preferences",
  "question_text": "¿Te gusta la pizza?",
  "correct_answers": ["sí", "si", "yes", "true"],
  "is_scorable": true
}
```

---

## Sections

Questions are grouped into three sections:

| Section | Icon | Purpose | Example |
|---------|------|---------|---------|
| `favorites` | ⭐ | Player's favorites | Favorite color, movie, food |
| `preferences` | 🤔 | Player's preferences | Coffee or tea, beach or mountain |
| `description` | ✍️ | Free-form responses | Describe the birthday person |

Sections determine how questions appear in the quiz UI and affect scoring.

---

## Best Practices

### Question Keys

- Use **snake_case**: `favorite_color`, `coffee_or_tea`
- Keep keys **short but descriptive**: `fav_color` vs `what_is_your_favorite_color_in_the_world`
- Use **consistent prefixes**: `fav_`, `pref_`, `desc_`
- Keys must be **unique per event**

### Correct Answers

- Provide **multiple acceptable answers** to improve matching: `["blue", "azul", "celeste"]`
- Answers are **case-insensitive**
- Trim whitespace automatically

### Scoring

- Set `is_scorable: false` for descriptive/open-ended questions
- Non-scorable questions still appear in the quiz but don't affect the score

### Import/Export

- Export questions before making bulk changes
- Use import to copy questions between events
- Review imported questions to verify correct answers transferred
