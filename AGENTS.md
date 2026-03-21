# AGENTS.md - EventHub

> Documento de contexto para agentes de IA y colaboradores humanos.
> Última actualización: 2026-03-20

---

## Visión General

**EventHub** es una plataforma de eventos interactivos para celebraciones. Los usuarios crean eventos, configuran quizzes personalizados, reciben postcards de invitados y comparten sorpresas con la caja secreta.

### Objetivos del Proyecto

1. **Funcional**: Eventos interactivos con quiz, ranking y postcards para ~50 usuarios simultáneos
2. **Escalable**: Arquitectura multi-evento que permita crear cualquier tipo de celebración
3. **Profesional**: UX pulida con animaciones, temas visuales y diseño mobile-first
4. **Portafolio**: Demostrar habilidades full-stack con React, Go, y arquitectura moderna

---

## Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.x | Framework UI |
| TypeScript | 5.x | Type safety |
| Vite | 7.x | Build tool / Dev server |
| React Router | 7.x | Navegación SPA |
| Tailwind CSS | 4.x | Estilos utility-first |
| Framer Motion | 12.x | Animaciones 2D, transiciones, gestos |
| React Three Fiber | 9.x | 3D declarativo (Three.js) |
| Drei | 10.x | Helpers para R3F |
| Lottie React | 2.x | Animaciones complejas pre-hechas |
| canvas-confetti | 1.x | Efectos de celebración |
| Zustand | 5.x | Estado global simple |
| Axios | 1.x | HTTP client |
| html-to-image | 1.x | Exportar elementos DOM como PNG |

### Backend

| Tecnología | Propósito |
|------------|-----------|
| Go 1.23 | API REST + WebSockets |
| Gin | HTTP framework |
| gorilla/websocket | WebSocket hub (ping/pong, broadcast) |
| PostgreSQL 15 | Base de datos relacional |
| Docker Compose | Orquestación de servicios |

### Testing

| Tecnología | Estado | Propósito |
|------------|--------|-----------|
| Go testing | ✅ Implementado | Unit tests backend (100% coverage) |
| Playwright | ✅ Configurado, 35/38 passing | E2E tests (3 skipped correctamente) |
| Vitest | ✅ Implementado | Unit tests frontend |

---

## Arquitectura Frontend

### Patrón: Feature-Based + Capas Internas

Cada feature (juego) es un módulo independiente con su propia estructura de capas, similar a un microservicio frontend.

```
src/
├── features/               # Módulos por funcionalidad
│   ├── landing/            # Feature: Landing page EventHub
│   │   ├── pages/           # LandingPage.tsx
│   │   ├── components/      # HeroSection, FeaturesGrid, EventCodeForm
│   │   └── store/          # landingStore.ts
│   │
│   ├── auth/                # Feature: Authentication
│   │   ├── pages/           # LoginPage, RegisterPage
│   │   └── store/          # authStore.ts (Zustand)
│   │
│   ├── dashboard/           # Feature: User dashboard
│   │   ├── pages/           # DashboardPage.tsx
│   │   ├── components/       # EventCard.tsx, EmptyState.tsx
│   │   └── store/           # dashboardStore.ts
│   │
│   ├── event-wizard/       # Feature: 3-step event creation
│   │   ├── pages/           # EventWizardPage.tsx
│   │   └── components/      # Step1_BasicInfo, Step2_Features, Step3_Theme
│   │
│   ├── event-admin/         # Feature: Event admin panel
│   │   ├── pages/           # EventAdminPage.tsx
│   │   ├── hooks/           # useEventAdmin.ts
│   │   └── components/      # ConfigTab, QuestionsTab, ThemeTab, StatsTab
│   │
│   ├── event-public/        # Feature: Public event pages /e/:slug
│   │   ├── pages/           # EventLandingPage, EventLayout
│   │   └── (uses shared components)
│   │
│   ├── quiz/               # Feature: Quiz framework (player-facing)
│   │   ├── pages/           # QuizPage, RegisterPage
│   │   └── store/           # quizStore.ts
│   │
│   ├── ranking/            # Feature: Ranking
│   │   ├── pages/          # RankingPage.tsx (WebSocket + 3D medals)
│   │   └── store/          # rankingStore.ts
│   │
│   ├── postcards/           # Feature: Cartelera + Secret Box
│   │   ├── pages/           # CorkboardPage, SecretBoxPage
│   │   └── components/      # PostcardCard, GiftBox, etc.
│
├── shared/                 # Código compartido
│   ├── components/         # Button, Header, PageLayout, ButterflyBackground,
│   │                       # Confetti, ErrorBoundary, Skeleton
│   ├── 3d/                 # MedalCanvas.tsx, Coin3D.tsx (React Three Fiber)
│   ├── hooks/              # useScrollAnimation.tsx, usePullToRefresh.ts
│   ├── store/              # websocketStore.ts (Zustand, singleton global)
│   ├── lib/                # api.ts (ApiClient singleton Axios), featureFlags.ts
│   └── index.ts            # Public API
│
├── assets/                 # Recursos estáticos (imágenes, videos, lottie)
└── styles/
    └── globals.css         # Tailwind + custom styles
```

### Mapeo de Capas (Backend → Frontend)

| Capa Backend | Equivalente Frontend | Ubicación |
|--------------|---------------------|-----------|
| Controllers | Pages | `features/*/pages/` |
| Use Cases | Hooks | `features/*/hooks/` |
| Repositories | Services | `features/*/services/` |
| Entities | Types | `features/*/types/` |
| Domain | Store | `features/*/store/` |

### Flujo de Datos

```
User Action → Page → Hook → Service → API (Go)
                ↓
            Store (estado)
                ↓
            Components (re-render)
```

---

## Convenciones de Código

### Nomenclatura

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `QuestionCard.tsx` |
| Hooks | camelCase con `use` prefix | `useQuiz.ts` |
| Services | camelCase con sufijo `Api` | `quizApi.ts` |
| Types | PascalCase con sufijo descriptivo | `quiz.types.ts` |
| Stores | camelCase con sufijo `Store` | `quizStore.ts` |
| Utils | camelCase | `formatters.ts` |

### Estructura de Componentes

```tsx
// Orden de imports
import { useState } from 'react';           // 1. React
import { motion } from 'framer-motion';     // 2. Librerías externas
import { Button } from '@/shared/components'; // 3. Shared
import { useQuiz } from '../hooks/useQuiz'; // 4. Feature local
import type { Question } from '../types';   // 5. Types (con type keyword)

// Props interface antes del componente
interface QuestionCardProps {
  question: Question;
  onSelect: (index: number) => void;
}

// Componente como function declaration (no arrow para mejor debugging)
export function QuestionCard({ question, onSelect }: QuestionCardProps) {
  // hooks primero
  const [selected, setSelected] = useState<number | null>(null);
  
  // handlers
  const handleSelect = (index: number) => {
    setSelected(index);
    onSelect(index);
  };

  // render
  return (
    <motion.div>
      {/* ... */}
    </motion.div>
  );
}
```

### Path Aliases

```json
{
  "@/*": ["./src/*"],
  "@/features/*": ["./src/features/*"],
  "@/shared/*": ["./src/shared/*"]
}
```

---

## Diseño Visual

### Paleta de Colores (Design System)

Sistema de diseño basado en tonos rosados con acentos vibrantes para temas de celebración:

```css
:root {
  /* Primary Pinks */
  --pink-100: #FFF5F7; /* Background Light */
  --pink-200: #FBCFE8; /* Secondary / Borders */
  --pink-300: #F9A8D4; /* Primary Pastel */
  --pink-400: #F48FB1; /* Ranking Primary */
  --pink-500: #EC4899; /* Main Action / Text */
  --pink-600: #DB2777; /* Accent */
  
  /* Backgrounds */
  --bg-light: #FFF5F7;
  --bg-dark: #2D1B24;
  
  /* Metals (Ranking) */
  --gold: #D4AF37;
  --silver: #C0C0C0;
  --bronze: #CD7F32;
  
  /* Effects */
  --glass-bg: rgba(255, 255, 255, 0.5);
  --glass-border: rgba(255, 255, 255, 0.4);
  --glass-blur: 8px;
}
```

> **Nota**: Los temas de evento pueden personalizar estos colores vía Theme Editor en el Admin Panel. El sistema soporta cualquier paleta hexadecimal.

### Tipografía

| Uso | Fuente | Fallback |
|-----|--------|----------|
| **Display / Títulos** | `Great Vibes` | `Dancing Script`, cursive |
| **Subtítulos / Elegante** | `Playfair Display` | serif |
| **Cuerpo / UI** | `Montserrat` | sans-serif |

> **Nota**: Importar fuentes de Google Fonts:
> `https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Montserrat:wght@300;400;500;600&display=swap`

### Componentes Visuales Clave

1.  **Fondos**:
    *   **Watercolor**: Gradientes radiales suaves (rosas y transparentes).
    *   **Butterfly**: Patrón de mariposas o SVGs posicionados absolutamente.
    *   **Sparkles**: Pequeños puntos brillantes animados.

2.  **Glassmorphism**:
    *   Usado en cards, rankings y contenedores.
    *   `backdrop-filter: blur(8px)`
    *   Borde blanco semitransparente.

3.  **Inputs**:
    *   Estilo "Material" simplificado: Fondo transparente, solo borde inferior (`border-b`).
    *   Focus color: `#DB2777` (Pink 600).

4.  **Botones**:
    *   Redondeados completos (`rounded-full`).
    *   Sombras suaves (`shadow-lg`, `shadow-pink-200`).
    *   Efecto hover y active scale.

### Temas de Evento

Cada evento puede personalizar su apariencia a través del Theme Editor en el Admin Panel:

- **Colores primarios y secundarios**
- **Color de fondo (light/dark)**
- **Tipografía personalizada**
- **Patrón de fondo (watercolor, butterfly, sparkles, solid)**
- **Avatares disponibles para jugadores**

El Theme Marketplace ofrece 6 presets pre-diseñados como punto de partida.

### Animaciones Requeridas

| Tipo | Implementación | Estado |
|------|----------------|--------|
| Transiciones entre pantallas | Framer Motion | ✅ Implementado |
| Hover/tap en botones | Framer Motion | ✅ Implementado |
| Confetti al ganar | canvas-confetti | ✅ Implementado |
| Elementos flotantes (mariposas) | CSS keyframes + Framer | ✅ Implementado |
| Monedas 3D girando | React Three Fiber | ✅ Implementado |
| Gift Box reveal (Secret Box) | Framer Motion | Pendiente |
| Postcards fly-out del Gift Box | Framer Motion (stagger) | Pendiente |
| Video celebration (top 3) | Lottie Animation | Pendiente (Phase 3) |
| Animaciones Lottie decorativas | Lottie React | Pendiente (Phase 3) | |

---

## Estado Actual del Proyecto

### Completado (Producción)

- [x] **EventHub Platform** — Refactor completo a plataforma multi-evento
- [x] **Landing Page** — Branding EventHub, hero, features, code entry
- [x] **Landing Page Improvements (Phase 3)** — Demo video, Pricing table, Testimonials carousel, Footer
- [x] **Event Wizard** — 3 pasos (Basic Info → Features → Theme Marketplace)
- [x] **Dashboard** — Grid de eventos con event cards, empty states
- [x] **Event Admin Panel** — Tabs (Config, Questions, Theme, Stats)
- [x] **Theme Marketplace** — 6 presets + editor visual
- [x] **Event-scoped Routes** — `/e/:slug/*` para páginas públicas
- [x] **Legacy Redirects** — `/quiz`, `/ranking`, `/corkboard` → `/e/:slug/*`
- [x] **Dark Mode** — Toggle con persistencia en localStorage
- [x] Setup Vite + React 19 + TypeScript + Tailwind 4
- [x] Backend Go + Gin + PostgreSQL (handlers, services, repository)
- [x] JWT Authentication con refresh tokens
- [x] WebSockets para ranking y postcards en tiempo real
- [x] 3D medals con React Three Fiber en el podio
- [x] Animaciones Framer Motion (transiciones por ruta, hover, tap)
- [x] Error Boundary global + inline
- [x] Skeleton loading states
- [x] Docker Compose (3 servicios: postgres, backend, frontend/nginx)
- [x] **Cartelera de Corcho** — Feature completo con WebSocket
- [x] **Secret Box Backend** — API endpoints para postcards secretas y reveal
- [x] **Video Postcards (Phase 3)** — Upload videos up to 30s, ffmpeg thumbnails, HTML5 player
- [x] **PWA Support (Phase 3)** — vite-plugin-pwa, manifest, service worker, install prompt
- [x] **i18n (Phase 3)** — react-i18next with ES/EN translations, language switcher
- [x] **Testing**:
  - [x] Playwright E2E (35/38 passing)
  - [x] Vitest unit tests frontend
  - [x] Go tests backend 100% coverage

### Pendiente — Phase 3 Growth & Polish

- [ ] Analytics Dashboard — Métricas para organizadores con Recharts
- [ ] Lottie Animations — Loading states, empty states
- [ ] Video Celebration — Lottie animation para top 3 en ranking

### Pendiente — Deuda Técnica

- [ ] Gift Box animation (Secret Box reveal)

---

## Quiz Framework — Especificaciones

EventHub usa un sistema de quiz configurable por evento. Cada evento define sus propias preguntas a través del Admin Panel.

### Modelo de Quiz Configurable

El admin define preguntas de estos tipos:

| Tipo | Descripción | Scoring |
|------|-------------|---------|
| **Texto libre** | Input de texto abierto | Comparación fuzzy (normalized Levenshtein) |
| **Opción múltiple** | Selección de una opción | Match exacto |
| **This or That** | Selector A/B | Match exacto |

### Pantallas del Quiz

1. **Landing del Evento** (`/e/:slug`)
   - Título del evento personalizado (ej: "¡Bienvenidos a mi Cumpleaños!")
   - Subtítulo configurable
   - Imagen/avatar del festejado
   - Botón "Empezar Juego"

2. **Registro** (`/e/:slug/quiz/register`)
   - Título "Registro de Jugador"
   - Input para nombre del participante
   - Avatar decorativo (seleccionable o aleatorio)
   - Botón "¡Listos para jugar!"

3. **Quiz** (`/e/:slug/quiz/play`)
   - Header configurable ("¡Juguemos! ¿Quién conoce más a [nombre]?")
   - Secciones de preguntas definidas por el admin
   - Botón "Enviar Respuestas"

4. **Gracias** (`/e/:slug/quiz/thank-you`)
   - Mensaje configurable "¡Gracias por participar!"
   - Carrusel de otros participantes jugando
   - Botón "Ver Ranking"

5. **Ranking** (`/e/:slug/ranking`)
   - Podio Top 3 (Oro, Plata, Bronce) con avatares grandes
   - Lista de participantes con puntuación
   - Card del usuario actual destacada ("TÚ")
   - Botón "Volver al inicio"

6. **Cartelera de Corcho** (`/e/:slug/corkboard`)
   - Fondo de textura de corcho (o según tema)
   - Postales "clavadas" con pins decorativos
   - Rotaciones aleatorias (-30° a 30°) para efecto desordenado
   - **Desktop**: Grid con postales dispersas, hover zoom al centro
   - **Mobile**: Columna única, tap abre modal fullscreen
   - Botón flotante (FAB) para agregar nueva postal
   - Cámara frontal para selfie + campo de mensaje
   - Descarga de postales como PNG
   - Actualización en tiempo real vía WebSocket
   - **Video Postcards**: Soporte para videos de hasta 30 segundos con thumbnail generado por ffmpeg

7. **Secret Box — Carga** (`/e/:slug/secret-box?token=TOKEN`)
   - Acceso vía link compartible con token de autorización
   - No requiere registro como jugador
   - Formulario: Nombre del remitente + Foto + Mensaje
   - Avatar fijo: 🎁 para todas las postcards secretas
   - Preview de cómo quedará la postal
   - Confirmación de envío exitoso

8. **Admin Panel** (`/e/:slug/admin`)
   - Acceso protegido con JWT del owner del evento
   - Tabs: Config, Preguntas, Tema, Stats
   - Para Secret Box: preview de postcards + botón revelar

### Scoring System

El sistema normaliza respuestas de texto para handlear mayúsculas, acentos y typos menores:

```
score = normalized_similarity(user_answer, correct_answer)  // 0.0 - 1.0
```

Para opción múltiple y A/B, el score es binario (0 o 1).

**Mensajes de Resultado (configurables por evento):**

| Score | Mensaje |
|-------|---------|
| 100% | "¡PERFECTO! ¡Conocés a [nombre] mejor que nadie!" |
| 80-90% | "¡Excelente! Sos muy cercano/a a [nombre]" |
| 60-70% | "¡Muy bien! Conocés bastante a [nombre]" |
| 40-50% | "No está mal, pero podés conocerlo/a mejor" |
| 0-30% | "¡A conocer más a [nombre]!" |

---

## Authentication

EventHub usa JWT Bearer tokens para autenticación.

### User Flow

1. **Registration**: User creates account at `/register`
2. **Login**: User authenticates at `/login` → receives JWT tokens
3. **Dashboard**: Authenticated users see their events at `/dashboard`
4. **Create Event**: Users create events at `/events/new`
5. **Event Admin**: Event owners manage via `/e/:slug/admin`

### Auth Store

Zustand store (`useAuthStore`) manages:
- User profile
- Access token (localStorage)
- Refresh token (localStorage)
- Auth state

### API Authentication

API client automatically adds `Authorization: Bearer <token>` header to all requests.
Token refresh happens automatically on 401 responses.

### Protected Routes

Routes under `/dashboard`, `/events/new`, and `/e/:slug/admin` require authentication.
Unauthenticated users are redirected to `/login`.

---

## API Endpoints (Backend Go)

### Authentication (JWT)

```
POST /api/auth/register    # Register new user (name, email, password)
POST /api/auth/login       # Login → returns JWT access + refresh tokens
POST /api/auth/refresh    # Refresh access token using refresh token
GET  /api/auth/me         # Get current authenticated user
POST /api/auth/logout     # Logout and revoke refresh token
```

### Events & Users

```
GET  /api/users/me/events   # Get authenticated user's events
POST /api/events            # Create new event
GET  /api/events/:id        # Get event details
GET  /api/events/by-slug/:slug  # Get event by slug
PUT  /api/events/:id        # Update event
DELETE /api/events/:id     # Delete event
GET  /api/themes/presets    # Get available theme presets
```

### Event Player Flow (No Auth Required)

```
POST /api/events/:slug/players       # Create player (name, avatar)
GET  /api/events/:slug/players/:id    # Get player by UUID
GET  /api/events/:slug/players        # List all players in event
```

### Quiz

```
POST /api/events/:slug/quiz/submit    # Submit answers (header: X-Player-ID)
GET  /api/events/:slug/quiz/answers/:player_id  # Get player's answers
GET  /api/events/:slug/quiz/questions  # Get quiz questions for event
```

### Ranking

```
GET /api/events/:slug/ranking         # Get full ranking for event
```

### Postcards

```
POST /api/postcards           # Create postcard (multipart: media OR image + message)
                              # Supports images (JPEG/PNG/WebP, 10MB max) and videos (MP4/WebM/MOV, 50MB max)
                              # Returns: id, image_path, media_type, thumbnail_path, media_duration_ms
GET  /api/postcards           # List postcards for event (query: ?event_id=)
POST /api/postcards/secret    # Create secret postcard (multipart: media OR image + message + sender_name)
```

### Admin Secret Box

```
GET  /api/events/:slug/admin/secret-box      # List secret postcards (auth: event owner)
POST /api/events/:slug/admin/reveal           # Reveal Secret Box (auth: event owner)
GET  /api/events/:slug/admin/secret-box/status  # Secret Box status
```

### Infrastructure

```
WS   /ws                      # WebSocket for real-time ranking and postcards
GET  /health                  # Health check
```

### Security & CORS

All origins configured via `CORS_ALLOWED_ORIGINS` env var control both HTTP API requests
and WebSocket connections. Wildcard origins are NOT supported for WebSocket upgrades.

### Flujo de Datos — Quiz

1. `POST /api/events/:slug/players` → Crea jugador, retorna UUID
2. `GET /api/events/:slug/quiz/questions` → Obtiene preguntas configuradas del evento
3. Jugador responde en frontend
4. `POST /api/events/:slug/quiz/submit` → Recibe respuestas
5. Backend: normaliza texto → guarda en DB → calcula score → actualiza player
6. Broadcast ranking vía WebSocket

### Flujo de Postcards

1. Recibe media (imagen o video) → valida tipo/tamaño por magic bytes
2. Guarda en disco (postcards/ o videos/)
3. Si es video: genera thumbnail con ffmpeg + extrae duración
4. Genera rotación aleatoria
5. Guarda en DB con event_id + media_type
6. Broadcast nueva postal vía WebSocket a todos los clientes del evento

### Flujo de Secret Postcards

1. Valida `X-Secret-Token` header
2. Recibe media (imagen o video) + mensaje + sender_name
3. Guarda con `is_secret=true`
4. NO broadcast (se guarda oculta hasta reveal)

### Flujo de Reveal

1. Valida auth del owner del evento
2. `UPDATE postcards SET revealed_at = NOW() WHERE is_secret = TRUE AND revealed_at IS NULL`
3. Broadcast WebSocket `secret_box_reveal` con las postcards reveladas
4. Todos los corkboards conectados reproducen la animación

---

## Secret Box — Plan (Pendiente)

> **Estado**: La implementación del backend está completa. Queda pendiente la animación GiftBox en frontend.

### Concepto

Sorpresa para el festejado: postcards de familiares/amigos que no pueden asistir a la fiesta.
Se cargan en secreto vía link compartible y se revelan con una animación de caja de regalos.

Las personas que no pueden asistir reciben un link (WhatsApp, etc.) donde suben una foto y un mensaje.
Estas postales se guardan ocultas. En un momento emotivo de la fiesta, el admin presiona un botón
y una caja de regalos animada aparece en el corkboard de todos los dispositivos conectados.
La caja se abre y las postales "vuelan" una por una, pineándose en el corcho.

### Decisiones de Diseño (Implementadas)

| Decisión | Opción Elegida | Motivo |
|----------|---------------|--------|
| Almacenamiento | Misma tabla `postcards` con campos extra | Merge trivial con `COALESCE`, sin UNION |
| `player_id` | Nullable para secrets | No contamina tabla players ni ranking |
| Nombre del remitente | Campo `sender_name` en la postal | Permite editar nombre por postal |
| Avatar secreto | Emoji fijo 🎁 | KISS, identidad visual "sorpresa" |
| Auth del link | Token simple (env var) | Es un link de WhatsApp, no un bank |
| Auth admin | JWT del owner del evento | Un solo admin por evento |
| Reveal | One-shot irreversible | Momento único, más impacto emocional |

### Modelo de Datos (Implementado)

```sql
-- Migration: 003_secret_box.sql
ALTER TABLE postcards ADD COLUMN sender_name VARCHAR(255);
ALTER TABLE postcards ADD COLUMN is_secret BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE postcards ADD COLUMN revealed_at TIMESTAMP;
ALTER TABLE postcards ALTER COLUMN player_id DROP NOT NULL;

-- Índice para queries de admin
CREATE INDEX idx_postcards_is_secret ON postcards(is_secret) WHERE is_secret = TRUE;
```

### Secuencia de Animación (Pendiente)

1. WebSocket recibe `secret_box_reveal` → CorkboardPage entra en "modo reveal"
2. **Gift Box aparece** — center viewport, `scale: 0 → 1` con spring (400ms)
3. **Wobble** — la caja se sacude 2-3 veces (rotate ±5°, 1.5 seg)
4. **Apertura** — tapa vuela hacia arriba con spring, fade out (600ms)
5. **Postcards fly-out** — stagger ~800ms entre cada una:
   - Cada postal escala desde 0 en el centro
   - Vuela hacia su posición en el grid con curva bezier
   - Al aterrizar: bounce + PushPin aparece
6. **Confetti** — canvas-confetti al pinear la última postal
7. **Gift Box desaparece** — fade out (300ms)
8. **Auto-open primera postal** — la primera se abre en modal automáticamente (delay 1s post-confetti)

### Componentes Frontend Pendientes

```
features/postcards/
├── components/
│   ├── GiftBox.tsx           # NUEVO: animación caja de regalos
│   └── PostcardCard.tsx      # MODIFICAR: usar sender_name, avatar 🎁
├── pages/
│   └── CorkboardPage.tsx     # MODIFICAR: integrar GiftBox reveal
└── hooks/
    └── usePostcards.ts       # MODIFICAR: suscribir a secret_box_reveal
```

---

## Recursos Adicionales

### Documentación

- [React Docs](https://react.dev)
- [Framer Motion](https://www.framer.com/motion/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [Gin Framework](https://gin-gonic.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Docker

```bash
# Iniciar todos los servicios
docker compose up -d

# Ver logs
docker compose logs -f

# Reiniciar backend
docker compose restart backend

# Acceder a PostgreSQL
docker compose exec postgres psql -U eventhub -d eventhub
```

### Variables de Entorno

```env
# Database
DATABASE_URL=postgres://eventhub:eventhub@localhost:5432/eventhub?sslmode=disable

# JWT
JWT_SECRET=tu-secret-key-minimo-32-caracteres
JWT_EXPIRY_HOURS=24
REFRESH_TOKEN_EXPIRY_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# Secret Box
SECRET_BOX_TOKEN=un-token-seguro-compartido-por-whatsapp

# Frontend
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
```

---

## Agent Skills

Este proyecto incluye skills personalizadas para agentes de IA en el directorio `skills/`:

| Skill | Descripción | Trigger Keywords |
|-------|-------------|------------------|
| `playwright-cli` | Comandos de automatización de navegador | "playwright", "navegador", "browser", "click", "screenshot" |
| `playwright-cli-e2e` | Testing E2E completo del flujo UI | "test E2E", "verify UI flow", "E2E testing", "UI testing", "flujo completo" |

### Uso de Skills

```bash
# Test completo E2E
$ /bin/bash skills/playwright-cli-e2e/assets/e2e-test-template.sh

# O paso a paso
$ playwright-cli open http://localhost:8082
$ playwright-cli goto /register
# ... continuar con flujo
```

Ver [SKILL.md](skills/playwright-cli-e2e/SKILL.md) para documentación completa.

---

## Notas para Colaboradores

1. **Mobile First**: Diseñar siempre pensando en móvil primero
2. **Accesibilidad**: Usar semántica correcta, ARIA cuando sea necesario
3. **Performance**: Lazy loading para features, code splitting por ruta
4. **No over-engineer**: Mantener la simplicidad, agregar complejidad solo cuando sea necesario
5. **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. **Event-scoped**: Todas las rutas públicas van bajo `/e/:slug/` para soporte multi-evento
7. **Configurable**: El quiz es genérico — el admin define preguntas y temas por evento

---

## Contacto

EventHub es una plataforma de eventos interactivos de código abierto.
Para dudas técnicas o contexto del proyecto, revisar este documento.
