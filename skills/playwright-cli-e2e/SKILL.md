---
name: playwright-cli-e2e
description: >
  End-to-end testing workflow using playwright-cli for The Mile Game.
  Verifies complete user flows, functionality, and design compatibility.
  Trigger: When user says "test E2E flow", "verify UI flow", "test with playwright", 
  "check functionality", "E2E testing", "UI testing", "browser testing".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Testing complete user flows (register → login → create event → etc.)
- Verifying UI functionality works end-to-end
- Checking design compatibility across routes
- Validating form submissions and API integration
- Regression testing after changes
- Verifying authentication flows

## Critical Patterns

### 1. Always Start Fresh
```bash
# Close any existing browser sessions first
playwright-cli close-all

# Open fresh browser
playwright-cli open http://localhost:8082
```

### 2. Use Local Storage for Auth State
```bash
# After login, save auth state
playwright-cli state-save auth.json

# Later, restore state to skip login
playwright-cli state-load auth.json
```

### 3. Verify at Each Step
Don't assume a click worked. Always verify:
- URL changed correctly
- Expected elements appear
- No console errors
- API calls succeeded (check network)

### 4. Use Element References Correctly
```bash
# GOOD: Use specific refs from snapshot
playwright-cli click e27

# BAD: Don't guess refs
playwright-cli click e5  # might be wrong element
```

### 5. Check Console and Network
```bash
# After each major action
playwright-cli console
playwright-cli network
```

## Complete Test Flow

### Phase 1: Registration Flow

```bash
# 1. Start fresh
playwright-cli open http://localhost:8082/register

# 2. Take baseline snapshot
playwright-cli snapshot --filename=01-register-page.yml

# 3. Fill registration form
playwright-cli fill e17 "Test User"
playwright-cli fill e20 "testuser@example.com"
playwright-cli fill e23 "TestPass123!"
playwright-cli fill e26 "TestPass123!"

# 4. Submit and verify
playwright-cli click e27
playwright-cli snapshot --filename=02-after-register.yml
playwright-cli localstorage-list  # Should show auth-token
```

### Phase 2: Dashboard Verification

```bash
# 1. Navigate to dashboard
playwright-cli goto http://localhost:8082/dashboard

# 2. Verify user info displayed
playwright-cli snapshot --filename=03-dashboard.yml

# 3. Check for "No events" state or event list
playwright-cli eval "document.body.innerText.includes('No tienes eventos') || document.body.innerText.includes('evento creado')"
```

### Phase 3: Create Event Flow

```bash
# 1. Go to create event
playwright-cli goto http://localhost:8082/events/new
playwright-cli snapshot --filename=04-create-event-page.yml

# 2. Fill event details
playwright-cli fill e54 "Evento de Prueba"
playwright-cli fill e58 "2026-12-25"
playwright-cli fill e64 "test-event-slug"

# 3. Toggle features (Quiz and Corkboard enabled by default)
# To disable: playwright-cli click e75  # Quiz toggle
# To enable SecretBox: playwright-cli click e85

# 4. Submit
playwright-cli click e90
sleep 2

# 5. Verify redirect to dashboard with new event
playwright-cli snapshot --filename=05-after-create-event.yml
```

### Phase 4: Event Page Verification

```bash
# 1. Navigate to event
playwright-cli goto http://localhost:8082/event/test-event-slug

# 2. Verify event loads
playwright-cli snapshot --filename=06-event-page.yml

# 3. Check navigation tabs
playwright-cli click e60  # Quiz tab
playwright-cli snapshot --filename=07-event-quiz-tab.yml

playwright-cli click e68  # Cartelera tab
playwright-cli snapshot --filename=08-event-corkboard-tab.yml

playwright-cli click e64  # Ranking tab
playwright-cli snapshot --filename=09-event-ranking-tab.yml
```

### Phase 5: Admin Panel Verification

```bash
# 1. Navigate to admin
playwright-cli goto http://localhost:8082/admin/event/test-event-slug/theme

# 2. Verify admin panel loads
playwright-cli snapshot --filename=10-admin-theme.yml

# 3. Test theme customization
playwright-cli click e22  # Select princess preset
sleep 1
playwright-cli snapshot --filename=11-admin-preset-selected.yml

# 4. Change color
playwright-cli fill e48 "FF6B6B"
playwright-cli snapshot --filename=12-admin-color-changed.yml
```

## Design Compatibility Checks

### Visual Regression Testing

```bash
# Take screenshots at key breakpoints
playwright-cli resize 1920 1080
playwright-cli goto http://localhost:8082/
playwright-cli screenshot --filename=desktop-home.png

playwright-cli resize 768 1024
playwright-cli screenshot --filename=tablet-home.png

playwright-cli resize 375 812
playwright-cli screenshot --filename=mobile-home.png
```

### Component Verification

```bash
# Verify specific components render correctly
playwright-cli eval "
  const checks = {
    header: !!document.querySelector('header'),
    navigation: !!document.querySelector('nav'),
    themeToggle: !!document.querySelector('[aria-label*=\"modo oscuro\"]'),
    footer: !!document.querySelector('footer'),
    mainContent: !!document.querySelector('main')
  };
  JSON.stringify(checks);
"
```

## Verification Commands

### Check Auth State
```bash
playwright-cli localstorage-list | grep auth
```

### Check User Info
```bash
playwright-cli eval "document.body.innerText.includes('Test User')"
```

### Check Event Created
```bash
playwright-cli eval "document.body.innerText.includes('Evento de Prueba')"
```

### Check for Errors
```bash
playwright-cli console | grep ERROR
```

### Check API Calls
```bash
playwright-cli network | grep -E "(POST|GET) /api"
```

## Common Issues & Solutions

### Issue: 403 Forbidden on API calls
**Solution**: Token expired or CORS issue
```bash
# Re-login
playwright-cli goto http://localhost:8082/login
# ... login flow ...
```

### Issue: Page shows 404
**Solution**: SPA routing not working, reload with full URL
```bash
playwright-cli goto http://localhost:8082/login
```

### Issue: Elements not found
**Solution**: Page still loading, wait or reload
```bash
sleep 2
playwright-cli reload
playwright-cli snapshot  # Get new refs
```

### Issue: Script references old bundle
**Solution**: Hard reload with cache clear
```bash
playwright-cli close
playwright-cli open http://localhost:8082/login
```

## Complete Test Script Template

See [assets/e2e-test-template.sh](assets/e2e-test-template.sh) for a complete automated test script.

## Quick Test Checklist

- [ ] Registration works and saves auth token
- [ ] Login works with valid credentials
- [ ] Dashboard shows user info
- [ ] Can create event with all fields
- [ ] Event page loads with correct data
- [ ] Navigation tabs work (Quiz, Ranking, Cartelera)
- [ ] Admin panel accessible
- [ ] Theme customization works
- [ ] No console errors
- [ ] Responsive design works (optional)

## Resources

- **Template Script**: See [assets/e2e-test-template.sh](assets/e2e-test-template.sh)
- **Playwright CLI Skill**: See [../playwright-cli/SKILL.md](../playwright-cli/SKILL.md)
- **AGENTS.md**: Project context in [/home/tadashi/dev/the-mile-game/AGENTS.md](/home/tadashi/dev/the-mile-game/AGENTS.md)

## Example Usage

```bash
# Test complete flow
$ /bin/bash .claude/skills/playwright-cli-e2e/assets/e2e-test-template.sh

# Or step by step with CLI
$ playwright-cli open http://localhost:8082
$ playwright-cli goto /register
$ playwright-cli fill e17 "Test User"
# ... etc
```
