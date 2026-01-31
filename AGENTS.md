# AGENTS.md - The Mile Game

> Documento de contexto para agentes de IA y colaboradores humanos.
> Última actualización: 2026-01-26

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
| React | 18.x | Framework UI |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool / Dev server |
| React Router | 6.x | Navegación SPA |
| Tailwind CSS | 3.x | Estilos utility-first |
| Framer Motion | 11.x | Animaciones 2D, transiciones, gestos |
| React Three Fiber | 8.x | 3D declarativo (Three.js) |
| Drei | 9.x | Helpers para R3F |
| Lottie React | 2.x | Animaciones complejas pre-hechas |
| canvas-confetti | 1.x | Efectos de celebración |
| TanStack Query | 5.x | Data fetching, caching, sync |
| Zustand | 4.x | Estado global simple |
| Axios | 1.x | HTTP client |

### Backend

| Tecnología | Propósito |
|------------|-----------|
| Go | API REST + WebSockets |
| Arquitectura por capas | Clean Architecture / Hexagonal |

### Testing (Futuro)

| Tecnología | Propósito |
|------------|-----------|
| Vitest | Unit tests |
| Playwright | E2E tests |

---

## Arquitectura Frontend

### Patrón: Feature-Based + Capas Internas

Cada feature (juego) es un módulo independiente con su propia estructura de capas, similar a un microservicio frontend.

```
src/
├── app/                    # Configuración global
│   ├── App.tsx             # Root component
│   ├── router.tsx          # Definición de rutas
│   └── providers.tsx       # Context providers
│
├── features/               # Módulos por funcionalidad
│   ├── quiz/               # Feature: Quiz de Mile
│   │   ├── components/     # UI específica
│   │   ├── hooks/          # Lógica de negocio
│   │   ├── services/       # API calls
│   │   ├── store/          # Estado local (Zustand slice)
│   │   ├── types/          # TypeScript types
│   │   ├── pages/          # Vistas/pantallas
│   │   └── index.ts        # Public API del feature
│   │
│   ├── ranking/            # Feature: Sistema de ranking
│   └── [future-game]/      # Futuros juegos
│
├── shared/                 # Código compartido
│   ├── components/         # UI reutilizable (Button, Card, Modal)
│   ├── animations/         # Framer Motion variants
│   ├── 3d/                 # Componentes React Three Fiber
│   ├── hooks/              # Hooks genéricos
│   ├── lib/                # Clients (axios, etc.)
│   ├── types/              # Tipos globales
│   └── utils/              # Funciones puras helper
│
├── assets/                 # Recursos estáticos
│   ├── images/
│   ├── videos/
│   └── lottie/
│
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

| Tipo | Implementación | Prioridad |
|------|----------------|-----------|
| Transiciones entre pantallas | Framer Motion | Alta |
| Hover/tap en botones | Framer Motion | Alta |
| Confetti al ganar | canvas-confetti | Alta |
| Elementos flotantes (mariposas) | CSS keyframes o Framer | Media |
| Monedas 3D girando | React Three Fiber | Media |
| Video de celebración ganador | HTML5 Video | Media |
| Animaciones Lottie decorativas | Lottie React | Baja |

---

## Estado Actual del Proyecto

### Completado

- [x] Diseño inicial en HTML/CSS/JS vanilla (`src/` folder - LEGACY)
- [x] Definición de arquitectura
- [x] Selección de stack tecnológico
- [x] Documentación AGENTS.md

### Pendiente - Fase 1: Setup

- [ ] Inicializar proyecto con Vite + React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar path aliases
- [ ] Crear estructura de carpetas
- [ ] Setup ESLint + Prettier

### Pendiente - Fase 2: Core Features

- [ ] Migrar quiz a React (feature/quiz)
- [ ] Implementar sistema de ranking (feature/ranking)
- [ ] Conectar con backend Go
- [ ] Implementar WebSockets para ranking real-time

### Pendiente - Fase 3: Polish

- [ ] Animaciones con Framer Motion
- [ ] Efectos 3D con React Three Fiber
- [ ] Confetti y celebraciones
- [ ] Video de ganador
- [ ] Testing

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

## API Endpoints (Backend Go - Por definir)

```
GET  /api/quiz/questions      # Obtener preguntas
POST /api/quiz/submit         # Enviar respuestas
GET  /api/ranking             # Obtener ranking
WS   /ws/ranking              # WebSocket para ranking real-time
```

---

## Archivos Legacy

El directorio `src/` contiene una versión inicial en HTML/CSS/JS vanilla. Esta versión:
- Sirve como referencia visual y de lógica
- Será reemplazada por la versión React
- Puede usarse para testing rápido del diseño

```
src/
├── index.html    # Estructura HTML de las 3 pantallas
├── styles.css    # Estilos completos con paleta rosa
└── script.js     # Lógica del quiz funcional
```

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
- [TanStack Query](https://tanstack.com/query)

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
