# Quiz API

> Detailed documentation for quiz questions and answers endpoints.

## Get Quiz Questions

Retrieve all active questions for an event (public endpoint).

```
GET /api/events/:slug/quiz/questions
```

### Response

```json
{
  "questions": [
    {
      "id": "uuid",
      "key": "favorite_color",
      "type": "text",
      "section": "favorites",
      "data": {
        "question": "¿Cuál es tu color favorito?"
      },
      "sort_order": 1,
      "is_scorable": true
    }
  ]
}
```

## Submit Quiz Answers

Submit answers for a player (requires player authentication).

```
POST /api/events/:slug/quiz/submit
```

### Headers

```
Authorization: Bearer {player-token}
```

### Request Body

```json
{
  "answers": [
    {
      "question_id": "uuid-1",
      "value": "blue"
    },
    {
      "question_id": "uuid-2",
      "value": "Coffee"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "score": 8,
  "total": 10,
  "message": "¡Excelente! Conocés bastante a Mile"
}
```

## Get Player Answers

Retrieve a player's submitted answers.

```
GET /api/events/:slug/quiz/answers/:playerId
```

### Headers

```
Authorization: Bearer {player-token}
```

### Response

```json
{
  "player_id": "uuid",
  "answers": [
    {
      "question_id": "uuid-1",
      "value": "blue",
      "is_correct": true
    }
  ]
}
```
