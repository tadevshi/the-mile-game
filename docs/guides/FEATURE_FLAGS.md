# Feature Flags Guide

The Mile Game uses feature flags to control which functionality is available for each event. This allows you to enable or disable features without redeploying the application.

## Available Features

### Quiz
- **Key:** `quiz`
- **Default:** `true`
- **Description:** Enables the interactive quiz game where guests answer questions about the birthday person.
- **User Impact:** When disabled, guests cannot access the quiz page.

### Corkboard (Postcards)
- **Key:** `corkboard`
- **Default:** `true`
- **Description:** Enables the digital corkboard where guests can upload photo postcards with messages.
- **User Impact:** When disabled, the corkboard page and upload functionality are hidden.

### Secret Box
- **Key:** `secret_box`
- **Default:** `false`
- **Description:** Enables the secret box feature for special surprises (e.g., messages from people who can't attend).
- **User Impact:** When enabled and revealed, shows secret postcards in a special animation.

## Managing Features

### Via Admin UI

1. Navigate to `/admin/events/{event-slug}/settings?key={admin-key}`
2. Toggle switches for each feature
3. Click "Save Changes"
4. Changes take effect immediately

### Via API

```typescript
// Update features
await api.updateEventFeatures('mile-2026', {
  quiz: true,
  corkboard: true,
  secretBox: false
});
```

## Common Use Cases

### Disable Quiz for Private Event
```json
{
  "quiz": false,
  "corkboard": true,
  "secret_box": false
}
```

### Enable Secret Box for Special Surprise
```json
{
  "quiz": true,
  "corkboard": true,
  "secret_box": true
}
```

### Minimal Setup (Corkboard Only)
```json
{
  "quiz": false,
  "corkboard": true,
  "secret_box": false
}
```

## Migration from Environment Variables

Previously, features were controlled via environment variables:
- `VITE_ENABLE_CORKBOARD`
- `VITE_ENABLE_SECRET_BOX`

These are now deprecated. Use the runtime feature flags instead for per-event control.
