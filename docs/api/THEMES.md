# Theme API Documentation

> API endpoints for event theme customization.

## Overview

The Theme API allows event organizers to customize the visual appearance of their events. Each event can have its own theme with custom colors, fonts, and background styles.

## Endpoints

### Public Endpoints

#### Get Event Theme

```http
GET /api/events/:slug/theme
```

Returns the theme configuration for an event. If no custom theme exists, returns the default "princess" preset.

**Parameters:**
- `slug` (path): Event slug (e.g., "mile-2026")

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "primaryColor": "#EC4899",
  "secondaryColor": "#FBCFE8",
  "accentColor": "#DB2777",
  "bgColor": "#FFF5F7",
  "textColor": "#1E293B",
  "displayFont": "Great Vibes",
  "headingFont": "Playfair Display",
  "bodyFont": "Montserrat",
  "logoPath": null,
  "heroImagePath": null,
  "backgroundStyle": "watercolor",
  "createdAt": "2026-03-17T10:00:00Z",
  "updatedAt": "2026-03-17T10:00:00Z"
}
```

#### List Theme Presets

```http
GET /api/themes/presets
```

Returns all available theme presets.

**Response (200 OK):**
```json
{
  "presets": [
    {
      "name": "princess",
      "primaryColor": "#EC4899",
      "secondaryColor": "#FBCFE8",
      "accentColor": "#DB2777",
      "bgColor": "#FFF5F7",
      "textColor": "#1E293B",
      "displayFont": "Great Vibes",
      "headingFont": "Playfair Display",
      "bodyFont": "Montserrat",
      "backgroundStyle": "watercolor"
    },
    {
      "name": "dark",
      "primaryColor": "#06B6D4",
      "secondaryColor": "#67E8F9",
      "accentColor": "#0891B2",
      "bgColor": "#0F172A",
      "textColor": "#F8FAFC",
      "displayFont": "Inter",
      "headingFont": "Roboto",
      "bodyFont": "Inter",
      "backgroundStyle": "dark"
    }
    // ... 4 more presets
  ]
}
```

### Admin Endpoints (Authentication Required)

#### Update Theme

```http
PUT /api/admin/events/:id/theme
```

Updates the theme for an event. Creates a new theme if one doesn't exist.

**Headers:**
- `Authorization`: Bearer {jwt-token}

**Parameters:**
- `id` (path): Event ID (UUID)

**Request Body:**
```json
{
  "primaryColor": "#FF0000",
  "accentColor": "#00FF00",
  "displayFont": "Custom Font"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "theme": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "eventId": "550e8400-e29b-41d4-a716-446655440001",
    "primaryColor": "#FF0000",
    "accentColor": "#00FF00",
    "displayFont": "Custom Font",
    // ... other fields
  }
}
```

#### Apply Preset

```http
POST /api/admin/events/:id/theme/preset
```

Applies a predefined theme preset to an event.

**Headers:**
- `Authorization`: Bearer {jwt-token}

**Parameters:**
- `id` (path): Event ID (UUID)

**Request Body:**
```json
{
  "preset": "dark"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "theme": {
    // Theme object with preset values
  }
}
```

**Available Presets:**
- `princess` - Pink watercolor theme
- `elegant` - Purple minimal theme
- `party` - Orange/yellow party theme
- `dark` - Dark cyan theme
- `corporate` - Blue professional theme
- `kids` - Green playful theme

## Frontend Usage

### Using the Theme Editor

Navigate to: `/admin/event/{event-id}/theme`

The theme editor provides:
1. **Preset Gallery** - Choose from 6 predefined themes
2. **Color Pickers** - Customize primary, secondary, accent, background, and text colors
3. **Font Selectors** - Choose display, heading, and body fonts
4. **Live Preview** - See changes in real-time

### CSS Variables

The theme system injects CSS custom properties into `:root`:

```css
:root {
  --color-primary: #EC4899;
  --color-secondary: #FBCFE8;
  --color-accent: #DB2777;
  --color-bg: #FFF5F7;
  --color-text: #1E293B;
  --font-display: 'Great Vibes', cursive;
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Montserrat', sans-serif;
}
```

Use these in your CSS or Tailwind classes:

```html
<!-- Using CSS variables directly -->
<div style="background-color: var(--color-primary);">

<!-- Using Tailwind with CSS variables -->
<div class="bg-[var(--color-primary)] text-[var(--color-text)]">
```

### Background Styles

The `backgroundStyle` field applies classes to `<body>`:

- `watercolor` - Radial gradient overlays
- `minimal` - Solid background color
- `dark` - Dark mode optimized
- `party` - Multi-color radial gradients

## Data Model

### Theme

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Theme record ID |
| `eventId` | UUID | Parent event ID |
| `primaryColor` | Hex | Main action color |
| `secondaryColor` | Hex | Borders, secondary elements |
| `accentColor` | Hex | Highlights, focus states |
| `bgColor` | Hex | Page background |
| `textColor` | Hex | Body text color |
| `displayFont` | String | Title font family |
| `headingFont` | String | Subtitle font family |
| `bodyFont` | String | Body text font family |
| `logoPath` | String? | Path to uploaded logo |
| `heroImagePath` | String? | Path to hero image |
| `backgroundStyle` | Enum | Visual style preset |

## Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid request body"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Not authorized to modify this event"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to update theme"
}
```

## Related Docs

- [Database Migrations](../guides/MIGRATIONS.md) - Theme table migration (006_themes.sql)
- [Theme System Guide](../guides/THEME_SYSTEM.md) - Using themes in React
