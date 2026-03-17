# Theme System Guide

> Complete guide to customizing event themes in The Mile Game.

## Overview

The Theme System allows event organizers to fully customize the visual appearance of their events without touching code. Each event can have its own:

- **Color scheme** - Primary, secondary, accent, background, and text colors
- **Typography** - Display, heading, and body fonts from Google Fonts
- **Background style** - Watercolor, minimal, dark, or party
- **Assets** - Custom logo and hero image (optional)

## Quick Start

### 1. Access the Theme Editor

Navigate to your event's theme editor:

```
http://localhost:8081/admin/event/{event-id}/theme
```

### 2. Choose a Preset (Optional)

Start with one of 6 predefined themes:

| Preset | Style | Best For |
|--------|-------|----------|
| **Princess** | Pink watercolor | Birthday parties, feminine events |
| **Elegant** | Purple minimal | Formal celebrations, anniversaries |
| **Party** | Orange/yellow | Fun gatherings, kids parties |
| **Dark** | Dark cyan | Modern events, tech themes |
| **Corporate** | Blue professional | Business events, conferences |
| **Kids** | Green playful | Children's parties |

Click any preset to apply it instantly.

### 3. Customize Colors

Click the color squares to open the color picker:

- **Primary Color** - Main buttons, links, highlights
- **Secondary Color** - Borders, backgrounds, accents
- **Accent Color** - Focus states, important elements
- **Background Color** - Page background
- **Text Color** - Body text and headings

### 4. Choose Fonts

Select from 14 Google Fonts:

**Display Fonts (Titles):**
- Great Vibes (handwritten)
- Playfair Display (elegant serif)
- Fredoka One (playful)
- Fredoka One (rounded)

**Heading Fonts (Subtitles):**
- Playfair Display
- Cinzel (formal)
- Raleway (modern)
- Nunito (friendly)

**Body Fonts (Text):**
- Montserrat (clean)
- Inter (modern)
- Lato (readable)
- Open Sans (neutral)

Each font selector shows a live preview.

### 5. Live Preview

The preview section at the bottom shows exactly how your theme will look:

- Title with display font
- Subtitle with heading font
- Body text with body font
- Buttons with primary/secondary colors

### 6. Save Changes

Click **"Save Changes"** to persist your theme. The changes take effect immediately for all visitors.

## Theme Presets Reference

### Princess (Default)
```
Primary: #EC4899 (Pink)
Secondary: #FBCFE8 (Light Pink)
Accent: #DB2777 (Dark Pink)
Background: #FFF5F7 (Very Light Pink)
Text: #1E293B (Dark Slate)
Fonts: Great Vibes / Playfair Display / Montserrat
Style: watercolor
```

### Elegant
```
Primary: #8B5CF6 (Purple)
Secondary: #DDD6FE (Light Purple)
Accent: #6D28D9 (Dark Purple)
Background: #F5F3FF (Very Light Purple)
Text: #1E293B (Dark Slate)
Fonts: Playfair Display / Cinzel / Lato
Style: minimal
```

### Dark
```
Primary: #06B6D4 (Cyan)
Secondary: #67E8F9 (Light Cyan)
Accent: #0891B2 (Dark Cyan)
Background: #0F172A (Dark Slate)
Text: #F8FAFC (White)
Fonts: Inter / Roboto / Inter
Style: dark
```

## Advanced Usage

### CSS Variables

Themes inject CSS custom properties automatically:

```css
/* Available in all components */
.element {
  background-color: var(--color-primary);
  color: var(--color-text);
  font-family: var(--font-display);
}
```

### Programmatic Theme Changes

Using the API directly:

```typescript
import { api } from '@/shared/lib/api';

// Update specific theme properties
await api.put(`/admin/events/${eventId}/theme`, {
  primaryColor: '#FF0000',
  accentColor: '#00FF00',
  displayFont: 'Custom Font'
});

// Apply a preset
await api.post(`/admin/events/${eventId}/theme/preset`, {
  preset: 'dark'
});
```

### Using in Components

Access theme in React components:

```typescript
import { useTheme } from '@/shared/theme';

function MyComponent() {
  const { theme, isLoading, error } = useTheme();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div style={{ color: theme.primaryColor }}>
      Custom themed content
    </div>
  );
}
```

## Background Styles

### Watercolor
Soft radial gradients, perfect for feminine/artistic events:
- Radial gradient overlays
- Soft edges
- Pink tones by default

### Minimal
Clean and simple:
- Solid background color
- No gradients
- Professional look

### Dark
Modern dark mode:
- Dark background
- Light text
- High contrast

### Party
Energetic and fun:
- Multiple radial gradients
- Colorful accents
- Celebration vibes

## Troubleshooting

### Theme Not Loading

1. Check browser console for errors
2. Verify event slug is correct
3. Check API response: `GET /api/events/{slug}/theme`

### Fonts Not Applied

1. Ensure font name is exactly as listed
2. Check browser DevTools for font-family
3. Verify Google Fonts are loading (check Network tab)

### Colors Not Updating

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check CSS variables in DevTools

## Best Practices

1. **Start with presets** - They're professionally designed
2. **Test on mobile** - Check how colors look on different screens
3. **Consider contrast** - Ensure text is readable on backgrounds
4. **Limit fonts** - 2-3 fonts max for consistency
5. **Save frequently** - Changes aren't persisted until saved

## Related Documentation

- [Theme API Reference](../api/THEMES.md)
- [Database Migration 006](../guides/MIGRATIONS.md)
- [CSS Variables Setup](../setup/THEME_SETUP.md)
