# AGENTS.md - The Mile Game

> Documento de contexto para agentes de IA y colaboradores humanos.
> Última actualización: 2026-02-25

---

## Visión General

**The Mile Game** es una plataforma de juegos interactivos para eventos y celebraciones. El proyecto inicial es un **quiz para el cumpleaños de Mile**, pero la arquitectura está diseñada para escalar y albergar múltiples juegos diferentes.

### Objetivos del Proyecto

1. **Funcional**: Quiz interactivo con ranking en tiempo real para ~50 usuarios simultáneos
2. **Educativo**: Aprender React y el ecosistema frontend moderno
3. **Portafolio**: Demostrar habilidades full-stack con animaciones y 3D
4. **Escalable**: Arquitectura que permita agregar nuevos juegos fácilmente

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
├── app/                    # Vacío — router y providers viven en App.tsx directamente
│
├── features/               # Módulos por funcionalidad
│   ├── quiz/               # Feature: Quiz de Mile
│   │   ├── hooks/          # useQuiz.ts (lógica del quiz completa)
│   │   ├── services/       # quizApi.ts (submit, fetch answers)
│   │   ├── store/          # quizStore.ts (Zustand, persistido en localStorage)
│   │   ├── types/          # quiz.types.ts
│   │   ├── pages/          # WelcomePage, RegisterPage, QuizPage, ThankYouPage
│   │   └── index.ts        # Public API del feature
│   │
│   ├── ranking/            # Feature: Sistema de ranking
│   │   ├── hooks/          # useRanking.ts (WebSocket + fetch)
│   │   ├── services/       # rankingApi.ts (fetch ranking)
│   │   ├── store/          # rankingStore.ts (solo currentPlayerId)
│   │   ├── types/          # ranking.types.ts
│   │   ├── pages/          # RankingPage.tsx (WebSocket live + 3D medals)
│   │   └── index.ts
│   │
│   ├── postcards/          # Feature: Cartelera de Corcho
│   │   ├── hooks/          # usePostcards.ts (WebSocket real-time)
│   │   ├── services/       # postcardApi.ts (image upload + resize)
│   │   ├── store/          # postcardStore.ts (Zustand)
│   │   ├── types/          # postcards.types.ts
│   │   ├── pages/          # CorkboardPage.tsx
│   │   ├── components/     # PostcardCard, PostcardModal, AddPostcardSheet,
│   │   │                   # PushPin, StampLayer, StampItem, GiftBox (pendiente)
│   │   └── index.ts
│   │
│   └── admin/              # Feature: Panel Admin (pendiente - Secret Box)
│       ├── pages/          # AdminPage.tsx (pendiente)
│       └── index.ts        # (pendiente)
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

Basado en los diseños de `anexus/design_cumple_mile`:

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

### Referencias de Diseño
Los archivos fuente se encuentran en `anexus/design_cumple_mile/`:
*   Bienvenida: `bienvenida_al_cumpleaños`
*   Quiz: `quiz_de_la_cumpleañera`
*   Ranking: `ranking_de_ganadores`

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
| Video de celebración ganador | HTML5 Video | Pendiente |
| Animaciones Lottie decorativas | Lottie React | Pendiente |

---

## Estado Actual del Proyecto

### Completado (Producción)

- [x] Setup Vite + React 19 + TypeScript + Tailwind 4
- [x] Estructura feature-based (quiz, ranking)
- [x] Todas las páginas implementadas (Welcome, Register, Quiz, ThankYou, Ranking)
- [x] Backend Go + Gin + PostgreSQL (handlers, services, repository)
- [x] Scoring server-side con normalización de texto (100% test coverage)
- [x] WebSockets para ranking en tiempo real (gorilla/websocket, auto-reconnect)
- [x] 3D medals con React Three Fiber en el podio
- [x] Animaciones Framer Motion (transiciones por ruta, hover, tap)
- [x] ButterflyBackground animado (8 mariposas, 15 partículas, 6 sparkles)
- [x] Confetti adaptativo según puntaje (canvas-confetti)
- [x] Error Boundary global + inline (fallback emoji para 3D)
- [x] Skeleton loading states (RankingSkeleton, QuizSkeleton, etc.)
- [x] Pull-to-refresh hook (móvil)
- [x] Emoji avatar picker en registro
- [x] Docker Compose (3 servicios: postgres, backend, frontend/nginx)
- [x] Nginx: proxy /api → backend, proxy /ws → WebSocket, SPA fallback
- [x] Despliegue funcional en 192.168.100.82:8081
- [x] `useQuiz.ts` y `quizApi.ts` implementados (lógica extraída de las pages)
- [x] `useRanking.ts` y `rankingApi.ts` implementados (lógica extraída de RankingPage)
- [x] `ThankYou.tsx` eliminado en favor de `ThankYouPage.tsx`
- [x] `usePullToRefresh.ts` exportado desde `shared/index.ts`
- [x] `quizStore.ts` actualizado con `correctAnswers` correctos
- [x] **Cartelera de Corcho** — Feature completo:
  - [x] Backend: tabla postcards, handlers, WebSocket broadcast
  - [x] Frontend: CorkboardPage, componentes, WebSocket real-time
  - [x] Botones de acceso en Welcome, ThankYou, Ranking
  - [x] Descarga de postales como PNG
  - [x] StampLayer decorativo (desktop) con descripciones del quiz
  - [x] Feature flag `VITE_ENABLE_CORKBOARD`
- [x] **Testing**:
  - [x] Playwright E2E configurado (35/38 passing, 3 skipped)
  - [x] Vitest unit tests frontend implementados
  - [x] Go tests backend 100% coverage

### Deuda Técnica (No bloqueante)
- [ ] `app/` directory vacío (se documentó como conteniendo router/providers)

### Completado — Secret Box (Feature Nueva)

> Ver sección [Secret Box — Plan de Implementación](#secret-box--plan-de-implementación) para detalles completos.

- [x] **Fase 1**: Backend — Migration, models, repository, handlers
- [x] **Fase 2**: Frontend — Ruta `/secret-box`, form de carga, feature flag
- [x] **Fase 3**: Admin — Ruta `/admin`, preview, botón reveal
- [x] **Fase 4**: Animación — GiftBox reveal en CorkboardPage
- [x] **Fase 5**: Integración — WebSocket, merge en corkboard, testing

### Pendiente — Otros

- [ ] Video de celebración para el ganador (HTML5 Video)
- [ ] Lottie animations decorativas
- [ ] Soporte de video en postcards (V2)
- [ ] Sistema de múltiples juegos (arquitectura ya preparada)

---

## Quiz de Mile - Especificaciones

### Pantallas

1. **Bienvenida** (`/`)
   - Título "¡Bienvenidos a mi Cumpleaños!"
   - Subtítulo "Mágica Celebración"
   - Foto central de la cumpleañera (estilo princesa)
   - Botón "Empezar Juego"

2. **Registro** (`/register`)
   - Título "Registro de Jugador"
   - Input para "Nombre de la Princesa/Invitado"
   - Avatar decorativo
   - Botón "¡Listos para jugar!"

3. **Quiz** (`/quiz`)
   - Header "¡Juguemos! ¿Quién conoce más a la cumpleañera?"
   - **Sección 1: Favoritos** (Inputs de texto)
     - Cantante, Flor, Bebida, Película Disney, Estación, Color, Algo que no le guste.
   - **Sección 2: ¿Qué prefiere?** (Selectores "This or That")
     - Café/Té, Playa/Montaña, Frío/Calor, Día/Noche, Pizza/Sushi, Tequila/Vino.
   - **Sección 3: Descripción** (Textarea)
     - "Descríbeme en una oración"
   - Botón "Enviar Respuestas"

4. **Gracias** (`/thank-you`)
   - Mensaje "¡Gracias por participar!"
   - Carrusel de "Otros invitados jugando"
   - Botón "Ver Ranking"

5. **Ranking** (`/ranking`)
   - Podio Top 3 (Oro, Plata, Bronce) con avatares grandes
   - Lista de participantes con puntuación
   - Card del usuario actual destacada ("TÚ")
   - Botón "Volver al inicio"

6. **Cartelera de Corcho** (`/corkboard`)
   - Fondo de textura de corcho realista
   - Postales "clavadas" con pins decorativos
   - Rotaciones aleatorias (-30° a 30°) para efecto desordenado
   - **Desktop**: Grid con postales dispersas, hover zoom al centro
   - **Mobile**: Columna única, tap abre modal fullscreen
   - Botón flotante (FAB) para agregar nueva postal
   - Cámara frontal para selfie + campo de mensaje
   - Descarga de postales como PNG
   - Actualización en tiempo real vía WebSocket

7. **Secret Box — Carga** (`/secret-box?token=TOKEN`)
   - Acceso vía link compartible con token de autorización
   - No requiere registro como jugador ni haber jugado el quiz
   - Formulario: Nombre del remitente + Foto + Mensaje
   - Avatar fijo: 🎁 para todas las postcards secretas
   - Preview de cómo quedará la postal "clavada en el corcho"
   - Confirmación de envío exitoso

8. **Admin** (`/admin?key=PASSPHRASE`)
   - Acceso protegido con passphrase (env var `ADMIN_PASSPHRASE`)
   - Lista de postcards secretas cargadas con preview
   - Contador: "N postcards secretas listas"
   - Botón "REVELAR SECRET BOX" con confirmación (acción irreversible)
   - Estado: muestra si ya fue revelada o no

### Preguntas (Basado en Diseño)

**Sección Favoritos (Texto libre o Multiple Choice a definir):**
- Cantante favorito
- Flor favorita
- Bebida favorita
- Película de Disney favorita
- Estación del año preferida
- Color favorito
- Algo que no le guste

**Sección Preferencias (A/B):**
- Café o Té
- Playa o Montaña
- Frío o Calor
- Día o Noche
- Pizza o Sushi
- Tequila o Vino (¿Validar si es para adultos o adaptar para niños?)

**Sección Extra:**
- Descríbeme en una oración (No puntuable, solo feed)


### Mensajes de Resultado

| Score | Mensaje |
|-------|---------|
| 10/10 | "¡PERFECTO! ¡Conocés a Mile mejor que nadie!" |
| 8-9 | "¡Excelente! Sos muy cercano/a a Mile" |
| 6-7 | "¡Muy bien! Conocés bastante a Mile" |
| 4-5 | "No está mal, pero podés conocerla mejor" |
| 0-3 | "¡A conocer más a Mile!" |

---

## Authentication

The Mile Game uses JWT Bearer tokens for authentication.

### User Flow

1. **Registration**: User creates account at `/register`
2. **Login**: User authenticates at `/login` → receives JWT tokens
3. **Dashboard**: Authenticated users see their events at `/dashboard`
4. **Create Event**: Users create events at `/events/new`
5. **Admin**: Event owners manage events via `/admin/*`

### Auth Store

Zustand store (`useAuthStore`) manages:
- User profile
- Access token (memory only)
- Refresh token (localStorage if "remember me")
- Auth state

### API Authentication

API client automatically adds `Authorization: Bearer <token>` header to all requests.
Token refresh happens automatically on 401 responses.

### Protected Routes

Routes under `/dashboard`, `/events/new`, and `/admin/*` require authentication.
Unauthenticated users are redirected to `/login`.

### Legacy Auth (Deprecated)

The previous authentication system using `X-Admin-Key` headers and `?key=` query parameters
has been deprecated and replaced with JWT-based authentication.

---

## API Endpoints (Backend Go)

```
POST /api/players             # Crear jugador (name, avatar)
GET  /api/players/:id         # Obtener jugador por UUID
GET  /api/players             # Listar todos los jugadores
POST /api/quiz/submit         # Enviar respuestas (header: X-Player-ID)
GET  /api/quiz/answers/:id    # Obtener respuestas de un jugador
GET  /api/ranking             # Obtener ranking completo
POST /api/postcards           # Crear postal (multipart: image + message, header: X-Player-ID)
GET  /api/postcards           # Listar todas las postales
POST /api/postcards/secret    # Crear postal secreta (multipart: image + message + sender_name, header: X-Secret-Token)
GET  /api/admin/secret-box    # Listar postcards secretas (header: X-Admin-Key)
POST /api/admin/reveal        # Revelar Secret Box (header: X-Admin-Key)
GET  /api/admin/status        # Estado de la Secret Box (header: X-Admin-Key)
WS   /ws                      # WebSocket para ranking y postcards real-time
GET  /health                  # Health check
```

El flujo de submit: recibe respuestas → normaliza texto → guarda en DB → calcula score → actualiza player → broadcast ranking vía WebSocket.

El flujo de postcards: recibe imagen → valida tipo/tamaño → guarda en disco → genera rotación aleatoria → guarda en DB → broadcast nueva postal vía WebSocket.

El flujo de secret postcards: valida token → recibe imagen + mensaje + sender_name → guarda con `is_secret=true` → NO broadcast (se guarda oculta hasta reveal).

El flujo de reveal: valida admin key → `UPDATE postcards SET revealed_at = NOW() WHERE is_secret = TRUE AND revealed_at IS NULL` → broadcast WebSocket `secret_box_reveal` con las postcards reveladas → todos los corkboards conectados reproducen la animación.

---

## Secret Box — Plan de Implementación

> Sorpresa para Mile: postcards de familiares/amigos que no pueden asistir a la fiesta.
> Se cargan en secreto vía link compartible y se revelan con una animación de caja de regalos.

### Concepto

Las personas que no pueden asistir a la fiesta reciben un link (WhatsApp, etc.) donde suben una foto y un mensaje para Mile. Estas postales se guardan ocultas. En un momento emotivo de la fiesta, el admin presiona un botón y una caja de regalos animada aparece en el corkboard de todos los dispositivos conectados. La caja se abre y las postales "vuelan" una por una, pineándose en el corcho junto con las demás.

### Decisiones de Diseño

| Decisión | Opción Elegida | Alternativa Descartada | Motivo |
|----------|---------------|----------------------|--------|
| Almacenamiento | Misma tabla `postcards` con campos extra | Tabla separada `secret_postcards` | Merge trivial con `COALESCE`, sin UNION |
| `player_id` | Nullable para secrets | Crear players fantasma | No contamina tabla players ni ranking |
| Nombre del remitente | Campo `sender_name` en la postal | Siempre del JOIN con players | Permite editar nombre por postal (préstamo de cel) |
| Avatar secreto | Emoji fijo 🎁 | Emoji picker | KISS, identidad visual "sorpresa" |
| Auth del link | Token simple (env var) | JWT / auth compleja | Es un link de WhatsApp, no un bank |
| Auth admin | Passphrase (env var) | Login / roles | Un solo admin, una sola acción |
| Video | V2 (no en primera implementación) | V1 con video | Foco en la animación de la caja |
| Reveal | One-shot irreversible | Múltiples reveals | Momento único, más impacto emocional |
| Nombre en form | Siempre visible, editable, pre-filled para registered | Solo para secrets | Resuelve préstamo de celular |

### Modelo de Datos — Cambios

```sql
-- Migration: 003_secret_box.sql
ALTER TABLE postcards ADD COLUMN sender_name VARCHAR(255);
ALTER TABLE postcards ADD COLUMN is_secret BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE postcards ADD COLUMN revealed_at TIMESTAMP;
ALTER TABLE postcards ALTER COLUMN player_id DROP NOT NULL;

-- Índice para queries de admin
CREATE INDEX idx_postcards_is_secret ON postcards(is_secret) WHERE is_secret = TRUE;
```

**Query de listado público (reemplaza al actual):**
```sql
SELECT p.*, 
  COALESCE(p.sender_name, pl.name) AS player_name,
  COALESCE(CASE WHEN p.is_secret THEN '🎁' END, pl.avatar) AS player_avatar
FROM postcards p
LEFT JOIN players pl ON p.player_id = pl.id
WHERE p.is_secret = FALSE OR p.revealed_at IS NOT NULL
ORDER BY p.created_at DESC;
```

### Endpoints Nuevos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/postcards/secret` | `X-Secret-Token` header | Crear postal secreta (multipart: image + message + sender_name) |
| `GET` | `/api/admin/secret-box` | `X-Admin-Key` header | Listar postcards secretas con preview |
| `POST` | `/api/admin/reveal` | `X-Admin-Key` header | Revelar Secret Box (one-shot, broadcast WS) |
| `GET` | `/api/admin/status` | `X-Admin-Key` header | Estado: `{ total: N, revealed: bool, revealed_at: timestamp }` |

### Env Vars Nuevas

```env
# Secret Box
SECRET_BOX_TOKEN=un-token-seguro-compartido-por-whatsapp
ADMIN_PASSPHRASE=passphrase-del-admin

# Feature flag (build-time)
VITE_ENABLE_SECRET_BOX=false
```

### WebSocket — Evento Nuevo

```json
{
  "type": "secret_box_reveal",
  "postcards": [
    {
      "id": "uuid",
      "sender_name": "Abuela Rosa",
      "player_avatar": "🎁",
      "image_path": "/uploads/postcards/uuid.jpg",
      "message": "¡Feliz cumple mi nieta!",
      "rotation": 12.5,
      "created_at": "2026-03-15T20:00:00Z"
    }
  ]
}
```

### Frontend — Componentes

```
features/postcards/
├── components/
│   ├── AddPostcardSheet.tsx  # MODIFICAR: agregar campo nombre, prop mode
│   ├── GiftBox.tsx           # NUEVO: animación caja de regalos
│   ├── PostcardCard.tsx      # MODIFICAR: usar sender_name, avatar 🎁
│   ├── PostcardModal.tsx     # (sin cambios)
│   └── PushPin.tsx           # (sin cambios)
├── pages/
│   ├── CorkboardPage.tsx     # MODIFICAR: integrar GiftBox reveal
│   └── SecretBoxPage.tsx     # NUEVO: form de carga para link compartible
└── hooks/
    └── usePostcards.ts       # MODIFICAR: suscribir a secret_box_reveal

features/admin/
├── pages/
│   └── AdminPage.tsx         # NUEVO: preview + botón reveal
└── index.ts
```

### Secuencia de Animación del Reveal

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

### Fases de Implementación

#### Fase 1: Backend — Base de datos y endpoints (1 sesión)

**Archivos a crear/modificar:**
- `backend/migrations/003_secret_box.sql` — Migration
- `backend/internal/models/models.go` — Agregar campos al modelo `Postcard`
- `backend/internal/repository/postcard_repository.go` — Nuevos queries
- `backend/internal/handlers/handlers.go` — 4 handlers nuevos
- `backend/internal/websocket/hub.go` — Evento `secret_box_reveal`
- `backend/cmd/api/main.go` — Registrar rutas nuevas

**Tareas:**
1. Crear migration `003_secret_box.sql`
2. Actualizar modelo Go: `SenderName *string`, `IsSecret bool`, `RevealedAt *time.Time`
3. Modificar `ListPostcards` query: filtrar `WHERE is_secret = FALSE OR revealed_at IS NOT NULL`
4. Nuevo: `CreateSecretPostcard(senderName, imagePath, message, rotation)` — sin player_id
5. Nuevo: `ListSecretPostcards()` — solo las secretas (para admin)
6. Nuevo: `RevealSecretBox()` — UPDATE revealed_at, retorna postcards reveladas
7. Nuevo: `GetSecretBoxStatus()` — count + revealed state
8. Handler `CreateSecretPostcard`: validar `X-Secret-Token`, multipart upload
9. Handler `ListSecretPostcards`: validar `X-Admin-Key`
10. Handler `RevealSecretBox`: validar `X-Admin-Key`, broadcast WS, idempotente si ya revelado
11. Handler `GetSecretBoxStatus`: validar `X-Admin-Key`
12. Actualizar `CreatePostcard` handler: aceptar `sender_name` opcional en form data
13. Tests para todos los handlers y repository nuevos

#### Fase 2: Frontend — Ruta Secret Box + Form de carga (1 sesión)

**Archivos a crear/modificar:**
- `frontend/src/features/postcards/pages/SecretBoxPage.tsx` — NUEVO
- `frontend/src/features/postcards/components/AddPostcardSheet.tsx` — MODIFICAR
- `frontend/src/features/postcards/types/postcards.types.ts` — MODIFICAR
- `frontend/src/features/postcards/services/postcardApi.ts` — MODIFICAR
- `frontend/src/shared/lib/api.ts` — Agregar métodos API
- `frontend/src/shared/lib/featureFlags.ts` — Agregar `SECRET_BOX`
- `frontend/src/App.tsx` — Agregar ruta `/secret-box`
- `.env`, `docker-compose.yml`, `Dockerfile` — Env vars nuevas

**Tareas:**
1. Agregar tipo `SecretPostcard` o extender `Postcard` con campos opcionales
2. Agregar `createSecretPostcard(image, message, senderName, token)` al API client
3. Agregar feature flag `VITE_ENABLE_SECRET_BOX`
4. Modificar `AddPostcardSheet`:
   - Agregar prop `mode: 'regular' | 'secret'`
   - Agregar campo nombre (pre-filled si regular, vacío si secret)
   - Enviar `sender_name` en el form data
   - Para `mode: 'secret'`: no requerir player_id
5. Crear `SecretBoxPage.tsx`:
   - Leer `token` de query params
   - Validar token (o mostrar error)
   - Renderizar `AddPostcardSheet` en modo `'secret'`
   - Feedback: "¡Tu postal secreta fue enviada!" con preview
6. Registrar ruta `/secret-box` en App.tsx (condicional por feature flag)
7. Agregar env vars a Docker pipeline

#### Fase 3: Frontend — Admin Panel (1 sesión)

**Archivos a crear/modificar:**
- `frontend/src/features/admin/pages/AdminPage.tsx` — NUEVO
- `frontend/src/features/admin/index.ts` — NUEVO
- `frontend/src/shared/lib/api.ts` — Agregar métodos admin
- `frontend/src/App.tsx` — Agregar ruta `/admin`

**Tareas:**
1. Agregar métodos al API client:
   - `getSecretBoxStatus(adminKey)` → `{ total, revealed, revealed_at }`
   - `listSecretPostcards(adminKey)` → `Postcard[]`
   - `revealSecretBox(adminKey)` → `{ postcards: Postcard[] }`
2. Crear `AdminPage.tsx`:
   - Leer `key` de query params, validar contra backend
   - Mostrar contador: "N postcards secretas listas"
   - Grid de preview de postcards secretas (reusar PostcardCard)
   - Botón "REVELAR SECRET BOX" con modal de confirmación
   - Estado post-reveal: "Secret Box revelada a las HH:MM"
3. Registrar ruta `/admin` en App.tsx

#### Fase 4: Frontend — Animación GiftBox Reveal (1-2 sesiones)

**Archivos a crear/modificar:**
- `frontend/src/features/postcards/components/GiftBox.tsx` — NUEVO
- `frontend/src/features/postcards/pages/CorkboardPage.tsx` — MODIFICAR
- `frontend/src/features/postcards/hooks/usePostcards.ts` — MODIFICAR
- `frontend/src/features/postcards/store/postcardStore.ts` — MODIFICAR

**Tareas:**
1. Agregar al store: `revealedPostcards: Postcard[]`, `isRevealing: boolean`
2. Modificar `usePostcards`: suscribir a evento WS `secret_box_reveal`
3. Crear componente `GiftBox.tsx`:
   - Box con tapa (frame divs con gradientes/sombras)
   - Animación wobble (Framer Motion keyframes)
   - Animación apertura (tapa spring up + fade)
   - Animación fade out del box
4. Modificar `CorkboardPage.tsx`:
   - Cuando `isRevealing = true`, renderizar `GiftBox` overlay
   - Stagger de postcards volando desde el centro
   - Cada postal aparece con spring + bounce al aterrizar
   - Confetti al finalizar la última postal
   - Auto-open primera postal en modal (delay 1s post-animación)
5. Manejar scroll durante la animación (lock scroll, o scroll to top)
6. Fallback: si llegan postcards sin haber visto la animación (recarga de página), simplemente aparecen en el grid

#### Fase 5: Integración y Testing (1 sesión)

**Tareas:**
1. Modificar `AddPostcardSheet` para postcards normales:
   - Agregar campo nombre pre-filled con player name
   - Enviar `sender_name` en form data
2. Test E2E: flujo completo secret box (carga → admin → reveal)
3. Test E2E: verificar que postcards secretas NO aparecen antes del reveal
4. Test E2E: verificar animación del reveal (at least que el GiftBox aparece)
5. Test unitario: nuevos handlers backend
6. Test unitario: componentes frontend nuevos
7. Verificar en mobile: animación, scroll, form de carga
8. Verificar en desktop: grid con postales secretas mergeadas
9. Docker rebuild completo y test en 192.168.100.82

---

## Recursos Adicionales

### Imagen de Referencia

`anexus/Captura de pantalla 2026-01-26 204049.png` - Imagen original del quiz con las preguntas y estilo visual de referencia.

### Links Útiles

- [React Docs](https://react.dev)
- [Framer Motion](https://www.framer.com/motion/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)

---

## Notas para Colaboradores

1. **Mobile First**: Diseñar siempre pensando en móvil primero
2. **Accesibilidad**: Usar semántica correcta, ARIA cuando sea necesario
3. **Performance**: Lazy loading para features, code splitting por ruta
4. **No over-engineer**: Mantener la simplicidad, agregar complejidad solo cuando sea necesario
5. **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)

---

## Contacto

Proyecto creado para el cumpleaños de Mile. Para dudas sobre el contexto del proyecto, revisar este documento o consultar el historial de conversación.
