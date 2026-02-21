# AGENTS.md - The Mile Game

> Documento de contexto para agentes de IA y colaboradores humanos.
> Última actualización: 2026-02-21

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
| Playwright | Specs escritas, no instalado | E2E tests (38 casos en `testsprite_tests/`) |
| Vitest | Pendiente | Unit tests frontend |

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
│   │   ├── hooks/          # useQuiz.ts — STUB: retorna {} (sin implementar)
│   │   ├── services/       # quizApi.ts — STUB: retorna {} (sin implementar)
│   │   ├── store/          # quizStore.ts (Zustand, persistido en localStorage)
│   │   ├── types/          # quiz.types.ts
│   │   ├── pages/          # WelcomePage, RegisterPage, QuizPage, ThankYouPage
│   │   │                   # ThankYou.tsx — ARCHIVO VACÍO (no usar)
│   │   └── index.ts        # Public API del feature
│   │
│   └── ranking/            # Feature: Sistema de ranking
│       ├── hooks/          # useRanking.ts — STUB: retorna {} (sin implementar)
│       ├── services/       # rankingApi.ts — STUB: retorna {} (sin implementar)
│       ├── store/          # rankingStore.ts (solo currentPlayerId)
│       ├── types/          # ranking.types.ts
│       ├── pages/          # RankingPage.tsx (WebSocket live + 3D medals)
│       └── index.ts
│
├── shared/                 # Código compartido
│   ├── components/         # Button, Header, PageLayout, ButterflyBackground,
│   │                       # Confetti, ErrorBoundary, Skeleton
│   ├── 3d/                 # MedalCanvas.tsx, Coin3D.tsx (React Three Fiber)
│   ├── hooks/              # useWebSocket.ts, useScrollAnimation.tsx,
│   │                       # usePullToRefresh.ts (no exportado aún)
│   ├── lib/                # api.ts (ApiClient singleton Axios)
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

### Deuda Técnica (No bloqueante)

- [ ] `useQuiz.ts` y `quizApi.ts` son stubs vacíos — la lógica está directo en las pages
- [ ] `useRanking.ts` y `rankingApi.ts` son stubs vacíos — la lógica está en RankingPage
- [ ] `ThankYou.tsx` es un archivo vacío (usar `ThankYouPage.tsx`)
- [ ] `usePullToRefresh.ts` no está exportado desde `shared/index.ts`
- [ ] `quizStore.ts` tiene `correctAnswers` desactualizados (Taylor Swift → Ricardo Arjona real)
- [ ] `app/` directory vacío (se documentó como conteniendo router/providers)

### Pendiente - Features Nuevas

- [ ] Instalar Playwright y ejecutar los 38 tests en `testsprite_tests/`
- [ ] Video de celebración para el ganador (HTML5 Video)
- [ ] Lottie animations decorativas
- [ ] Vitest unit tests para frontend
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

## API Endpoints (Backend Go)

```
POST /api/players             # Crear jugador (name, avatar)
GET  /api/players/:id         # Obtener jugador por UUID
GET  /api/players             # Listar todos los jugadores
POST /api/quiz/submit         # Enviar respuestas (header: X-Player-ID)
GET  /api/quiz/answers/:id    # Obtener respuestas de un jugador
GET  /api/ranking             # Obtener ranking completo
WS   /ws                      # WebSocket para ranking real-time
GET  /health                  # Health check
```

El flujo de submit: recibe respuestas → normaliza texto → guarda en DB → calcula score → actualiza player → broadcast ranking vía WebSocket.

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
