# Question Editor Guide

> Complete user guide for managing quiz questions in The Mile Game admin panel.

## Overview

The Question Editor allows event organizers to create, edit, and manage quiz questions for their events. It's part of the admin panel and provides a visual interface for:

- Creating new questions with different types (text, choice, boolean)
- Organizing questions by sections (Favorites, Preferences, Description)
- Setting correct answers for automatic scoring
- Reordering questions via drag-and-drop
- Importing/exporting questions for backup or reuse
- Validating questions to prevent duplicates

## Accessing the Question Editor

### URL Format

```
http://localhost:8081/admin/event/{event-slug}/questions?key={admin-key}
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `event-slug` | The unique identifier for your event (e.g., `mile-2026`) |
| `admin-key` | Your admin authentication key |

> **Note**: You need owner access to the event to use the Question Editor.

## The Interface

When you open the Question Editor, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│ ← Editor de Preguntas           mile-2026     12 preguntas │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────┐│
│ │ ⭐ Favorites                 │ │                         ││
│ │ ┌─────────────────────────┐ │ │   ✏️ Crear nueva        ││
│ │ │ ? favorite_color        │ │ │   pregunta              ││
│ │ │ ¿Cuál es tu color...    │ │ │                         ││
│ │ └─────────────────────────┘ │ │   Completa el           ││
│ │ ┌─────────────────────────┐ │ │   formulario para       ││
│ │ │ ? favorite_food          │ │ │   agregar una pregunta  ││
│ │ │ ¿Cuál es tu comida...   │ │ │                         ││
│ │ └─────────────────────────┘ │ │   [+ Favorites]         ││
│ │                             │ │   [+ Preferences]       ││
│ │ 🤔 Preferences              │ │   [+ Description]       ││
│ │ ┌─────────────────────────┐ │ │                         ││
│ │ │ ? coffee_or_tea          │ │ │                         ││
│ │ │ ¿Café o Té?              │ │ │                         ││
│ │ └─────────────────────────┘ │ │                         ││
│ │                             │ │                         ││
│ │ ✍️ Description              │ │                         ││
│ │ ┌─────────────────────────┐ │ │                         ││
│ │ │ ? describe_mile          │ │ │                         ││
│ │ │ Descríbeme en una...    │ │ │                         ││
│ │ └─────────────────────────┘ │ │                         ││
│ └─────────────────────────────┘ └─────────────────────────┘│
│                                                             │
│ [Exportar] [Importar]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Left Panel: Question List

- Displays all questions grouped by section
- Each question shows: key, preview of question text
- Drag handles for reordering
- Edit (✏️) and Delete (🗑️) buttons per question
- Section headers with icons

### Right Panel: Form Area

- **When no question selected**: Shows buttons to create new questions by section
- **When editing/creating**: Shows the question form with live preview

## Creating Questions

### Step 1: Choose a Section

Click one of the section buttons:
- ⭐ **Favorites** - For favorite things (colors, movies, foods)
- 🤔 **Preferences** - For "this or that" choices
- ✍️ **Description** - For free-form responses

### Step 2: Fill the Form

| Field | Required | Description |
|-------|----------|-------------|
| **Key** | ✅ | Unique identifier (e.g., `favorite_color`) |
| **Question** | ✅ | The question text players see |
| **Type** | ✅ | `text`, `choice`, or `boolean` |
| **Correct Answers** | For scorable | Acceptable answers (one per line or comma-separated) |
| **Options** | For choice type | Available choices |
| **Scorable** | ✅ | Whether this affects the player's score |

### Question Types

#### Text Questions

For open-ended answers where players type their response.

**Example:**
- Question: `¿Cuál es tu color favorito?`
- Type: `text`
- Correct Answers: `azul, blue, rosa, rosado`

The system will accept any of these answers (case-insensitive).

#### Choice Questions

For "this or that" style questions where players select one option.

**Example:**
- Question: `¿Café o Té?`
- Type: `choice`
- Options: `Café, Té`
- Correct Answers: `Café`

#### Boolean Questions

For yes/no questions.

**Example:**
- Question: `¿Te gusta la pizza?`
- Type: `boolean`
- Correct Answers: `sí, si, yes, true`

### Step 3: Set Correct Answers

For scorable questions, define what answers are correct:

1. Enter one answer per field
2. Add more answer fields with the `+` button
3. The system is **case-insensitive** (all converted to lowercase)
4. Provide multiple variations to improve matching

**Example - "Favorite Color":**
- Correct Answer 1: `azul`
- Correct Answer 2: `blue`
- Correct Answer 3: `rosa`

A player answering "Azul", "AZUL", or "BLUE" will all get it correct.

### Step 4: Save

Click **Guardar pregunta** to create the question.

## Editing Questions

1. Click the **Edit button** (✏️) on any question
2. The form populates with that question's data
3. Modify any fields
4. Click **Guardar pregunta** to save changes

## Deleting Questions

1. Click the **Delete button** (🗑️) on any question
2. A confirmation modal appears
3. Click **Eliminar** to confirm (this cannot be undone)

> **Tip**: Use Export first if you might need to restore questions later.

## Reordering Questions

### Using Drag and Drop

1. Grab the **drag handle** (⋮⋮) on the left side of a question
2. Drag it to the new position
3. Release to drop

The new order is saved automatically.

### Manual Sort Order

Each question has a `sort_order` value. When you drag questions, the backend updates all sort orders to maintain sequence (1, 2, 3, ...).

## Import/Export

### Export Questions

Click **Exportar** to download all questions as a JSON file.

**Use cases:**
- Backup before making changes
- Copy questions to another event
- Share question templates

The exported file contains:
```json
{
  "event": "Mile's Birthday Party",
  "questions": [
    {
      "section": "favorites",
      "key": "favorite_color",
      "question_text": "¿Cuál es tu color favorito?",
      "correct_answers": ["azul", "blue"],
      "options": null,
      "sort_order": 1,
      "is_scorable": true
    }
  ]
}
```

### Import Questions

Click **Importar** to upload a JSON file with questions.

**Rules:**
- Keys must be unique (not already in the event)
- All questions must have: `section`, `key`, `question_text`
- `sort_order: 0` means "auto-assign next available"
- Existing questions are not modified

**Import workflow:**
1. Click Importar
2. Select a JSON file
3. Review the preview (shows how many will import)
4. Confirm to import

**Warnings** (don't fail import):
- Duplicate keys (skipped)
- Missing optional fields

**Errors** (fail entire import):
- Missing required fields
- Invalid JSON

## Section Guidelines

### ⭐ Favorites

For questions about player's favorites:

- What's your favorite color?
- What's your favorite movie?
- What's your favorite food?
- What's your favorite song?

### 🤔 Preferences

For "this or that" style questions:

- Coffee or Tea?
- Beach or Mountain?
- Pizza or Sushi?
- Summer or Winter?

### ✍️ Description

For free-form responses (usually non-scorable):

- Describe yourself in one sentence
- What would you tell the birthday person?
- Describe your perfect celebration

## Scoring

### Scorable Questions

- Count toward the player's final score
- Require correct answers to be defined
- Display in the ranking

### Non-Scorable Questions

- For fun/engagement only
- Don't affect ranking
- Use for description sections or icebreakers

**Tip**: Make description questions non-scorable since there's no single "correct" answer.

## Best Practices

### Question Keys

- Use **snake_case**: `favorite_color`, `coffee_or_tea`
- Keep them **short but descriptive**: `fav_movie` not `what_is_your_all_time_favorite_movie`
- Use **consistent prefixes**:
  - `fav_` for favorites
  - `pref_` for preferences
  - `desc_` for description

### Correct Answers

- Provide **multiple acceptable answers** for better matching
- Include common misspellings or variations
- Test your questions before the event!

### Question Text

- Keep questions **short and clear**
- Use **simple language** suitable for all guests
- Avoid ambiguous questions

### Testing Your Quiz

1. Create a few test questions
2. Play through the quiz as a guest
3. Verify correct answers are recognized
4. Test edge cases (capitalization, extra spaces)
5. Adjust correct answers as needed

## Troubleshooting

### "Key already exists" Error

Each question key must be unique within an event. Choose a different key or delete the existing question with that key.

### Questions Not Saving

Check:
- All required fields are filled
- Question key uses only letters, numbers, and underscores
- Correct answers format is correct (array of strings)

### Import Fails

Common causes:
- Duplicate keys in the import file
- Missing required fields
- Invalid JSON syntax

### Can't Reorder

Make sure you're using a desktop browser. Mobile drag-and-drop may have limitations.

## API Reference

For developers integrating with the API directly, see [Question Editor API](QUESTIONS.md).

## Need Help?

- Check the API documentation for technical details
- Review existing questions in your event for examples
- Contact support for additional assistance
