# Frontend Test Plan - The Mile Game

## Bootstrap Result

**Testsprite Bootstrap Status**: ✅ Successfully Bootstrapped

**Project Details**:
- **Framework**: React + TypeScript + Vite
- **Testing Tool**: Playwright
- **Dev Server**: http://localhost:5173/
- **Bootstrap Date**: 2026-02-03
- **Test Location**: `/frontend/testsprite_tests/`

**Test Files Created**:
1. `navigation.spec.ts` - Page navigation tests
2. `welcome.spec.ts` - Welcome page tests  
3. `register.spec.ts` - Registration form validation tests
4. `quiz.spec.ts` - Quiz question answering tests
5. `zustand.spec.ts` - State management tests
6. `routing.spec.ts` - Routing between pages tests

---

## Test Coverage

### 1. Welcome Page Navigation

**File**: `welcome.spec.ts`

#### Test Cases:
| Test ID | Description | Expected Result |
|---------|-------------|----------------|
| WP-001 | Display welcome page elements | All elements visible (title, subtitle, button) |
| WP-002 | Show decorative elements | Butterfly SVGs and Mile's initial displayed |
| WP-003 | Navigate to register on button click | URL changes to /register, registration form visible |

#### Key Elements Tested:
- Header: "¡Bienvenidos a mi Cumpleaños!"
- Subtitle: "Mágica Celebración"
- Tagline: "¿Qué tanto me conoces?"
- CTA Button: "Empezar Juego"
- Decorative SVG butterflies
- Avatar with "M" initial

---

### 2. Register Page Form Validation

**File**: `register.spec.ts`

#### Test Cases:
| Test ID | Description | Expected Result |
|---------|-------------|----------------|
| RV-001 | Display register form elements | Header, avatar, input, and button visible |
| RV-002 | Error for empty name submission | Error message "Por favor ingresa tu nombre" displayed |
| RV-003 | Error for whitespace-only name | Validation error shown, remains on register page |
| RV-004 | Accept valid name and navigate | Redirects to /quiz with player name stored |
| RV-005 | Accept long names | Successfully navigates with long names |
| RV-006 | Clear error on typing | Error disappears when user starts typing |

#### Validation Rules:
- **Required**: Name cannot be empty
- **Whitespace**: Name cannot be whitespace-only
- **Length**: No maximum length restriction (tested with 40+ chars)
- **Real-time**: Error clears on input change

---

### 3. Quiz Page Question Answering

**File**: `quiz.spec.ts`

#### Test Cases:
| Test ID | Description | Expected Result |
|---------|-------------|----------------|
| QP-001 | Display quiz header with player name | Shows personalized greeting with registered name |
| QP-002 | Display all favorite questions | All 7 favorite questions visible |
| QP-003 | Allow answering favorite questions | Text inputs accept and display answers |
| QP-004 | Display preference questions | 6 "This or That" questions visible |
| QP-005 | Allow selecting preferences | Option buttons can be selected |
| QP-006 | Display description section | Textarea visible with placeholder |
| QP-007 | Allow entering description | Textarea accepts and displays text |
| QP-008 | Display score counter | Score indicator visible, starts at 0 |
| QP-009 | Update score on correct answers | Score increases when correct answers entered |
| QP-010 | Submit and navigate to thank you | Redirects to /thank-you after submission |
| QP-011 | Redirect if accessing without registration | Redirects to /register if no player name in store |

#### Question Categories:
**Favorites (Text Input)**: 7 questions
- Cantante favorito
- Flor favorita
- Bebida favorita
- Película de Disney favorita
- Estación del año preferida
- Color favorito
- Algo que no le guste

**Preferences (This or That)**: 6 questions
- Café o Té
- Playa o Montaña
- Frío o Calor
- Día o Noche
- Pizza o Sushi
- Tequila o Vino

**Description**: 1 textarea
- Descríbeme en una oración

---

### 4. State Management with Zustand

**File**: `zustand.spec.ts`

#### Test Cases:
| Test ID | Description | Expected Result |
|---------|-------------|----------------|
| ZS-001 | Persist player name in store | Name persists across page reloads |
| ZS-002 | Persist quiz answers | Answers survive page refreshes |
| ZS-003 | Persist score | Score maintained after reload |
| ZS-004 | Reset quiz on new game | Starting new game clears previous state |
| ZS-005 | Clear localStorage | Clearing storage resets all state |
| ZS-006 | Handle concurrent updates | Multiple rapid updates work correctly |

#### Store Features Tested:
- **Persistence**: localStorage integration via Zustand middleware
- **Player Name**: Stored and retrieved across sessions
- **Answers**: Favorites, preferences, and description persisted
- **Score**: Real-time calculation and persistence
- **Reset**: Complete state clearing functionality

---

### 5. Routing Between Pages

**File**: `routing.spec.ts`

#### Test Cases:
| Test ID | Description | Expected Result |
|---------|-------------|----------------|
| RT-001 | Route to home page | / displays welcome page |
| RT-002 | Route to register page | /register displays registration form |
| RT-003 | Route to quiz with registered user | /quiz accessible after registration |
| RT-004 | Route to thank you after submission | /thank-you displayed after quiz completion |
| RT-005 | Route to ranking page | /ranking displays ranking |
| RT-006 | Handle 404 for unknown routes | Displays 404 error page |
| RT-007 | Maintain browser history | Back/forward navigation works correctly |
| RT-008 | Deep link protection | Quiz redirects to register without registration |
| RT-009 | Preserve query parameters | Query params handled during navigation |
| RT-010 | Handle rapid route changes | No crashes on rapid navigation |

#### Routes Covered:
- `/` - Welcome Page
- `/register` - Registration Page
- `/quiz` - Quiz Page (protected)
- `/thank-you` - Thank You Page
- `/ranking` - Ranking Page
- `*` - 404 Page

---

## Additional Navigation Tests

**File**: `navigation.spec.ts`

#### Test Cases:
| Test ID | Description | Expected Result |
|---------|-------------|----------------|
| NAV-001 | Navigate Welcome to Register | Successful navigation with button click |
| NAV-002 | Navigate back to Welcome | Back link returns to welcome page |

---

## Test Execution Instructions

### Prerequisites:
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Run Tests:
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test welcome.spec.ts

# Run with UI mode
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Run with debug
npx playwright test --debug
```

### Test Configuration:
```javascript
// playwright.config.ts
{
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  }
}
```

---

## Test Data

### Sample Player Names:
- `María` - Basic name
- `María de las Mercedes de la Concepción` - Long name
- `TestPlayer` - Testing name
- `PersistentPlayer` - Persistence testing

### Sample Quiz Answers:
**Correct Answers** (for scoring tests):
- Singer: "Taylor Swift"
- Flower: "Rosa"
- Drink: "Café"
- Disney: "La Sirenita"
- Season: "Primavera"
- Color: "Rosa"
- Dislike: "El desorden"

**Preferences**:
- Coffee: "Café"
- Place: "Playa"
- Weather: "Calor"
- Time: "Noche"
- Food: "Sushi"
- Drink: "Vino"

---

## Success Criteria

All tests should:
- ✅ Pass in headless mode
- ✅ Pass in headed mode
- ✅ Run consistently (no flaky tests)
- ✅ Complete within 60 seconds per test file
- ✅ Clean up state between tests
- ✅ Work across different viewport sizes

---

## Maintenance Notes

### When to Update Tests:
1. **UI Changes**: Update selectors when components change
2. **New Features**: Add tests for new functionality
3. **Route Changes**: Update routing tests when URL structure changes
4. **State Changes**: Modify Zustand tests when store structure changes

### Common Issues:
- **Timing**: Increase timeouts if animations slow down interactions
- **Selectors**: Use role-based selectors for better resilience
- **State**: Always clear localStorage in beforeEach hooks

---

## Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Welcome Page | 3 | ✅ Complete |
| Register Form | 6 | ✅ Complete |
| Quiz Page | 11 | ✅ Complete |
| State Management | 6 | ✅ Complete |
| Routing | 10 | ✅ Complete |
| Navigation | 2 | ✅ Complete |
| **Total** | **38** | **✅ Complete** |
