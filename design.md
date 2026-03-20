# Technical Design: EventHub Refactor

## Technical Approach

Transform "The Mile Game" into a universal event platform with:
1. **New landing page** (EventHub brand) to replace current quiz landing
2. **User dashboard** for event management
3. **3-step event wizard** for progressive creation flow
4. **Tabbed admin panel** for unified event management
5. **Theme marketplace** with 6 presets
6. **Event-scoped routing** (`/e/:slug/*`) for shareable URLs
7. **Legacy redirects** for backward compatibility

---

## Architecture Decisions

| Decision | Option | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| **Route Structure** | `/e/:slug/*` + legacy redirects | Flat routes (`/quiz`, `/ranking`) | Shareable URLs, multi-event support, SEO-friendly |
| **Admin Tabs** | Single `/admin/:slug` with tabs | Separate routes per tab | Unified UX, state persistence, mobile-friendly |
| **Wizard Pattern** | 3-step with validation per step | Single long form | Lower cognitive load, progressive disclosure |
| **Theme System** | JSON data + CSS variables + presets | CSS-in-JS, styled-components | Runtime theming, cacheable, no build step |
| **Landing Page** | New dedicated landing feature | Modify existing welcome | Clean separation, dual purpose (marketing + entry) |
| **Dark Mode Fix** | Explicit toggle, no auto-detect | System preference auto | Prevents conflicts with event themes |
| **State Management** | Zustand stores per feature | Redux, Context API | Existing pattern, simple, works with devtools |

---

## Route Map

### New Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | EventHub marketing landing (NEW) |
| `/dashboard` | `DashboardPage` | User events grid (NEW) |
| `/events/new` | `EventWizardPage` | 3-step creation wizard (NEW) |
| `/admin/:slug` | `EventAdminPage` | Tabbed admin panel (NEW) |
| `/admin/:slug/theme` | `ThemeEditorPage` | Theme customization (existing, moved) |
| `/admin/:slug/questions` | `QuestionEditorPage` | Quiz questions (existing, moved) |
| `/e/:slug` | `EventLandingPage` | Public event entry (NEW) |
| `/e/:slug/register` | `RegisterPage` | Player registration (existing, scoped) |
| `/e/:slug/quiz` | `QuizPage` | Quiz game (existing, scoped) |
| `/e/:slug/ranking` | `RankingPage` | Live ranking (existing, scoped) |
| `/e/:slug/corkboard` | `CorkboardPage` | Postcards (existing, scoped) |
| `/e/:slug/thank-you` | `ThankYouPage` | Post-quiz thanks (existing, scoped) |

### Legacy Routes → Redirects

| Old Route | Redirect Target | Notes |
|-----------|-----------------|-------|
| `/` (existing quiz) | `/e/mile-game-2026` or landing if no legacy | Configurable via feature flag |
| `/quiz-register` | `/e/:slug/register` | Uses `currentEvent` from localStorage |
| `/quiz` | `/e/:slug/quiz` | Uses `currentEvent` from localStorage |
| `/thank-you` | `/e/:slug/thank-you` | Uses `currentEvent` from localStorage |
| `/ranking` | `/e/:slug/ranking` | Uses `currentEvent` from localStorage |
| `/corkboard` | `/e/:slug/corkboard` | Uses `currentEvent` from localStorage |

---

## Component Hierarchy

```
App.tsx
├── / (LandingPage) ← NEW
│   ├── HeroSection
│   ├── FeaturesGrid
│   └── CTASection
│
├── /dashboard (DashboardPage) ← NEW
│   ├── DashboardHeader
│   ├── EventGrid
│   │   └── EventCard (existing)
│   └── EmptyState
│
├── /events/new (EventWizardPage) ← NEW
│   ├── StepIndicator
│   ├── Step1_BasicInfo
│   ├── Step2_Features
│   │   └── FeatureToggle (existing)
│   ├── Step3_Theme
│   │   └── ThemePresetGallery (existing)
│   └── WizardNavigation
│
├── /admin/:slug (EventAdminPage) ← NEW
│   ├── AdminHeader
│   ├── TabNav [Config | Questions | Theme | Stats]
│   └── TabContent
│       ├── ConfigTab
│       ├── QuestionsTab → QuestionEditorPage (existing)
│       ├── ThemeTab → ThemeEditorPage (existing)
│       └── StatsTab ← NEW (placeholder)
│
├── /e/:slug/* (EventLayout)
│   ├── EventHeader
│   ├── EventTabs [Quiz | Ranking | Corkboard]
│   └── Outlet → quiz/ranking/corkboard pages
│
└── LegacyRoutes (backward compat)
    └── Redirect components
```

---

## API Design

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/themes/presets` | - | List 6 preset themes |
| GET | `/api/users/me/events` | JWT | List user's events |
| POST | `/api/events` | JWT | Create new event |
| GET | `/api/events/:slug` | - | Get event public info |
| PUT | `/api/events/:slug` | JWT (owner) | Update event |
| DELETE | `/api/events/:slug` | JWT (owner) | Delete event |
| GET | `/api/events/:slug/theme` | - | Get event theme |
| PUT | `/api/admin/events/:slug/theme` | JWT (owner) | Update theme |

### Modified Endpoints (add event scope)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/events/:slug/players` | - | Create player scoped to event |
| POST | `/api/events/:slug/quiz/submit` | X-Player-ID | Submit quiz for event |
| GET | `/api/events/:slug/ranking` | - | Get event ranking |
| GET | `/api/events/:slug/postcards` | - | List event postcards |
| POST | `/api/events/:slug/postcards` | X-Player-ID | Create event postcard |

### Existing Endpoints (legacy support)

All existing endpoints continue working, internally routing to default event (`mile-game-2026`).

---

## State Management

### Store Updates

| Store | Changes |
|-------|---------|
| `eventStore.ts` | ✅ Exists — no changes needed |
| `authStore.ts` | ✅ Exists — no changes needed |
| `quizStore.ts` | Add `eventSlug` to quiz submission |
| `rankingStore.ts` | Add `eventSlug` to ranking fetch |
| `postcardStore.ts` | Add `eventSlug` to postcard operations |
| **NEW: `landingStore.ts`** | Hero animation state, CTA tracking |
| **NEW: `wizardStore.ts`** | Multi-step form state, validation |
| **NEW: `dashboardStore.ts`** | Event list, filters, pagination |

### Data Flow

```
User visits /events/new
    ↓
WizardStore: initialize form state
    ↓
Step 1: Basic Info → validate → next
Step 2: Features → toggle states → next  
Step 3: Theme → select preset → submit
    ↓
API POST /api/events
    ↓
DashboardStore: invalidate cache
    ↓
Navigate to /dashboard (shows new event)
```

---

## Migration Plan

### Phase 1: Database & Backend (Day 1)

1. **Migration 004_event_refactor.sql**:
   ```sql
   -- Create events table (exists partially, verify columns)
   -- Verify: slug, name, date, description, owner_id, features JSON, is_active
   
   -- Create event_themes table
   CREATE TABLE IF NOT EXISTS event_themes (
     event_id UUID PRIMARY KEY REFERENCES events(id),
     primary_color VARCHAR(7),
     secondary_color VARCHAR(7),
     accent_color VARCHAR(7),
     bg_color VARCHAR(7),
     text_color VARCHAR(7),
     display_font VARCHAR(50),
     heading_font VARCHAR(50),
     body_font VARCHAR(50),
     background_style VARCHAR(20),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Insert theme presets reference data
   INSERT INTO theme_presets (id, name, config) VALUES
     ('princess', 'Princesa', '{...}'),
     ('elegant', 'Elegante', '{...}'),
     ('party', 'Fiesta', '{...}'),
     ('corporate', 'Corporativo', '{...}'),
     ('wedding', 'Boda', '{...}'),
     ('birthday', 'Cumpleaños', '{...}');
   ```

2. **Backend handlers**: Add scoped routes, theme preset endpoints

### Phase 2: Frontend Core (Days 2-3)

1. **New features/**:
   - `features/landing/` - Landing page with hero, features, CTAs
   - `features/dashboard/` - Dashboard with event grid
   - `features/event-wizard/` - 3-step wizard
   - `features/event-admin/` - Tabbed admin panel

2. **Modify existing features**:
   - Update `App.tsx` with new routes
   - Add legacy redirect components
   - Scope quiz/ranking/postcards to event slug

### Phase 3: Theme & Polish (Days 4-5)

1. Theme marketplace integration
2. Dark mode fix (explicit toggle)
3. Animations with Framer Motion
4. Mobile responsiveness

### Phase 4: Testing & Deploy (Days 6-7)

1. E2E tests for new flows
2. Verify legacy redirects
3. Database migration on staging
4. Production deploy

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/features/landing/` | Create | New landing page feature |
| `frontend/src/features/landing/pages/LandingPage.tsx` | Create | Hero + features + CTAs |
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | Modify | Redesign based on Stitch |
| `frontend/src/features/event-wizard/` | Create | 3-step wizard feature |
| `frontend/src/features/event-admin/` | Create | Tabbed admin panel |
| `frontend/src/App.tsx` | Modify | New route structure + redirects |
| `frontend/src/shared/components/LegacyRedirect.tsx` | Create | Redirect component for old routes |
| `backend/migrations/004_event_refactor.sql` | Create | Database migration |
| `backend/internal/handlers/themes.go` | Create | Theme preset handlers |
| `backend/internal/handlers/events.go` | Modify | Add scoped endpoints |

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Wizard step validation, theme utils | Vitest |
| Integration | Event CRUD, theme application | React Testing Library |
| E2E | Full wizard flow, legacy redirects | Playwright |
| Visual | Stitch design compliance | Manual + screenshots |

---

## Open Questions

- [ ] Which theme preset designs are finalized? (Stitch shows marketplace grid)
- [ ] Should `/` redirect to `/e/:slug` or show landing for logged-out users?
- [ ] Stats tab content - what metrics? (player count, engagement, etc.)
- [ ] Timeline for deprecating legacy routes?

---

## Stitch Design References

| Screen | Stitch ID | Description |
|--------|-----------|-------------|
| Mobile Landing | 006be255c071495fb124f4738ae54023 | Hero + features |
| Desktop Landing | 9f936db487a44fc6a029e44933727757 | Full landing page |
| Event Wizard Step 1 | 306bc157e59b4b1d963abf2fe150fa60 | Basic info form |
| Event Wizard Step 2 | e4858b30e7a9458c9563ad050b79a608 | Feature toggles |
| Theme Marketplace | 0c1f121fe1f143368ad14a98c2f39114 | Grid of presets |
| Dashboard | 0221362330f44e9f9b7db190b02738b0 | Event cards grid |
| Admin Config | 86f62efe421e435184e17f49be5da2f1 | Tabbed interface |
