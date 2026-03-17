# 🎉 The Mile Game - Birthday Quiz Platform

> **Una plataforma interactiva de quiz para cumpleaños donde los invitados compiten en un ranking en tiempo real.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-1.23-00ADD8?logo=go)](https://go.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)

---

## 📋 Tabla de Contenidos

- [Overview](#-overview)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Contribución](#-contribución)
- [Documentación](#-documentación)

---

## 🎯 Overview

**The Mile Game** es un quiz interactivo diseñado para eventos y celebraciones. Los invitados responden preguntas sobre el cumpleañero/a y compiten en un ranking en tiempo real.

### **Características Principales**

✅ **Quiz Interactivo** - 13 preguntas (favoritos + preferencias + descripción)  
✅ **Ranking en Vivo** - Leaderboard con podio para los top 3  
✅ **Cartelera de Corcho** - Postcards con fotos y mensajes pineados en un corcho  
✅ **Animaciones** - Framer Motion para transiciones suaves  
✅ **Confetti** - Celebraciones visuales según el puntaje  
✅ **Responsive Design** - Mobile-first, optimizado para smartphones  
✅ **Real-time Updates** - WebSockets para ranking y postcards en vivo  
✅ **3D Medals** - Monedas giratorias React Three Fiber en el podio  
✅ **Error Boundaries** - Manejo de errores global e inline  
✅ **Secret Box** - Postcards sorpresa de familiares reveladas con animación de caja de regalos  

---

## 🛠 Stack Tecnológico

### **Frontend**

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.x | Framework UI |
| TypeScript | 5.x | Type safety |
| Vite | 7.x | Build tool / Dev server |
| React Router | 7.x | Navegación SPA |
| Tailwind CSS | 4.x | Estilos utility-first |
| Framer Motion | 12.x | Animaciones 2D + transiciones |
| React Three Fiber | 9.x | 3D declarativo (Three.js) |
| Drei | 10.x | Helpers para R3F |
| Zustand | 5.x | Estado global |
| Axios | 1.x | HTTP client |
| canvas-confetti | 1.x | Efectos de celebración |
| lottie-react | 2.x | Animaciones Lottie |

### **Backend**

| Tecnología | Propósito |
|------------|-----------|
| Go 1.23 | API REST + WebSockets |
| Gin | HTTP framework |
| gorilla/websocket | WebSocket hub con auto-reconnect |
| PostgreSQL 15 | Base de datos relacional |
| Docker | Containerización |

### **Testing**

- ✅ **Go testing** - `normalizer_test.go` + `scorer_test.go` (100% coverage)
- ✅ **Playwright** - 35/38 passing (3 correctly skipped), config in `playwright.config.ts`
- ✅ **Vitest** - Unit tests frontend implementados

---

## 🏗 Arquitectura

### **Patrón: Feature-Based con Capas Internas**

```
┌─────────────────────────────────────────────────┐
│              Frontend (React)                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Pages → Hooks → Services → API Client   │   │
│  │   ↓       ↓                              │   │
│  │ Components ← Store (Zustand)            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
               ↕ HTTP/REST    ↕ WebSocket (/ws)
┌─────────────────────────────────────────────────┐
│              Backend (Go + Gin)                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Handlers → Services → Repository        │   │
│  │      ↓                    ↓              │   │
│  │  WS Hub               PostgreSQL         │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### **Docker Services**

```yaml
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │      │   Backend    │      │  PostgreSQL  │
│   (Nginx)    │──────│   (Go API)   │──────│     (DB)     │
│  Port: 8081  │ HTTP │  Port: 8080  │ SQL  │  Port: 5432  │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                    Docker Network
                    (milegame-network)
```

---

## 🚀 Instalación

### **Prerequisitos**

- **Docker** >= 20.10
- **Docker Compose** >= 1.29
- **Git**

### **1. Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/the-mile-game.git
cd the-mile-game
```

### **2. Configurar variables de entorno**

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores (opcional, los defaults funcionan)
nano .env
```

**Variables importantes:**

```env
# Puertos
FRONTEND_PORT=8081      # Puerto del frontend
BACKEND_PORT=8080       # Puerto interno del backend
POSTGRES_PORT=5432      # Puerto interno de PostgreSQL

# Base de datos
DB_USER=user
DB_PASSWORD=password
DB_NAME=milegame

# CORS (agregar dominios de producción aquí)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081

# Secret Box (generar tokens seguros antes de la fiesta)
SECRET_BOX_TOKEN=token-secreto-para-el-link   # Token del link compartible
ADMIN_PASSPHRASE=passphrase-del-admin          # Contraseña del panel admin

# Feature flags (habilitar funcionalidades)
VITE_ENABLE_CORKBOARD=true
VITE_ENABLE_SECRET_BOX=true
```

### **3. Levantar los servicios**

```bash
# Build y start de todos los servicios
docker-compose up -d --build

# Verificar que están corriendo
docker-compose ps
```

**Output esperado:**

```
    Name                  Command                State           Ports
-------------------------------------------------------------------------
milegame-db    postgres                         Up (healthy)   5432/tcp
milegame-api   ./main                           Up (healthy)   8080/tcp
milegame-web   nginx                            Up (healthy)   0.0.0.0:8081->80/tcp
```

### **4. Acceder a la aplicación**

🌐 **Frontend**: [http://localhost:8081](http://localhost:8081)

---

## 🎁 Secret Box — Guía Operacional

La **Secret Box** permite que familiares o amigos que no pueden asistir envíen fotos y mensajes secretos a Mile. Se guardan ocultos y se revelan con una animación durante la fiesta.

### **Paso 1 — Configurar tokens antes de la fiesta**

Editá el `.env` con valores seguros (no usar los defaults en producción):

```env
SECRET_BOX_TOKEN=TmG_2026_x4Qp!9zBf7L       # Lo que va en el link compartible
ADMIN_PASSPHRASE=Adm!n_Secr3t_9vL2#         # Para acceder al panel de admin
VITE_ENABLE_SECRET_BOX=true                 # Habilitar la feature
```

Rebuild necesario si cambiás `VITE_ENABLE_SECRET_BOX` (está bakeado en el bundle):

```bash
docker-compose up -d --build
```

### **Paso 2 — Construir el link a compartir**

La URL tiene el siguiente formato:

```
http://<HOST>/secret-box?token=<SECRET_BOX_TOKEN>
```

**Ejemplos:**

| Entorno | URL |
|---------|-----|
| Local | `http://localhost:8081/secret-box?token=cumple-mile-2026-secreto` |
| Red local (fiesta) | `http://192.168.100.82:8081/secret-box?token=cumple-mile-2026-secreto` |
| Producción | `https://milejuego.com/secret-box?token=cumple-mile-2026-secreto` |

> ⚠️ **El token en la URL debe coincidir exactamente con `SECRET_BOX_TOKEN` en el `.env`.**

### **Paso 3 — Compartir el link**

Enviá el link por **WhatsApp, email o cualquier canal** a las personas que no pueden asistir. Cada persona:

1. Abre el link en su celular
2. Sube una foto y escribe un mensaje para Mile
3. Ve una confirmación de envío exitoso

No necesitan registrarse ni haber jugado el quiz.

### **Paso 4 — Revisar las postales desde el admin**

El panel de admin te muestra cuántas postales secretas fueron enviadas y un preview de cada una:

```
http://<HOST>/admin?key=<ADMIN_PASSPHRASE>
```

**Ejemplo:**

```
http://192.168.100.82:8081/admin?key=solo-yo-lo-se-123
```

### **Paso 5 — Revelar la Secret Box durante la fiesta**

Cuando llegue el momento emotivo, desde el panel admin:

1. Verificá el contador: **"N postales secretas listas"**
2. Presioná **"REVELAR SECRET BOX"**
3. Confirmá la acción (es **irreversible** — one-shot)
4. En **todos los dispositivos** conectados al corkboard aparece la animación:
   - 🎁 Caja de regalos aparece al centro
   - La caja se abre y las postales "vuelan" hacia el corcho
   - Confetti al final
   - La primera postal se abre automáticamente en modal

> **💡 Tip**: Antes de revelar, asegurate de que la pantalla principal (TV o proyector de la fiesta) esté mostrando el Corkboard (`/corkboard`).

### **Troubleshooting — Secret Box**

**El link dice "Token inválido":**
- Verificá que `VITE_ENABLE_SECRET_BOX=true` en el `.env` y que hiciste rebuild
- Verificá que el token en la URL coincide exactamente con `SECRET_BOX_TOKEN` (case-sensitive, sin espacios)

**La ruta `/secret-box` no existe (404):**
- La feature está deshabilitada. Verificá `VITE_ENABLE_SECRET_BOX=true` y rebuild del frontend

**El admin dice "No autorizado":**
- El valor del query param `key` debe coincidir exactamente con `ADMIN_PASSPHRASE` en el `.env`

**Resetear estado del reveal (para volver a ejecutar la animación):**

```bash
docker exec -it milegame-db psql -U user -d milegame -c \
  "UPDATE postcards SET revealed_at = NULL WHERE is_secret = TRUE;"
```

Marca todas las postales secretas como "no reveladas". El admin puede volver a presionar "REVELAR SECRET BOX" desde el panel y la animación se dispara de nuevo en todos los dispositivos conectados.

---

## 💻 Uso

### **Modo Producción (Docker)**

```bash
# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Detener servicios
docker-compose down

# Detener Y eliminar volúmenes (resetea DB)
docker-compose down -v
```

### **Modo Desarrollo (Local)**

#### **Frontend**

```bash
cd frontend

# Instalar dependencias
npm install

# Dev server con hot-reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

Accede a: [http://localhost:5173](http://localhost:5173)

#### **Backend**

```bash
cd backend

# Instalar dependencias
go mod download

# Configurar env local
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=user
export DB_PASSWORD=password
export DB_NAME=milegame
export GIN_MODE=debug
export CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Correr servidor
go run cmd/api/main.go

# Build
go build -o bin/server cmd/api/main.go
./bin/server
```

**⚠️ Nota**: Para desarrollo local del backend, necesitás tener PostgreSQL corriendo (podés usar solo `docker-compose up postgres`).

---

## 🧪 Testing

### **Backend (Go)**

```bash
cd backend

# Correr todos los tests
go test ./...

# Tests con coverage
go test -cover ./...

# Coverage detallado
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

**Tests existentes:**
- ✅ `normalizer_test.go` - 100% coverage
- ✅ `scorer_test.go` - 100% coverage

### **Frontend (Futuro)**

```bash
cd frontend

# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npx playwright test

# Coverage
npm run test:coverage
```

---

## 🌍 Deployment

### **Producción con Docker Compose**

1. **Configurar `.env` para producción:**

```env
# Cambiar a modo release
GIN_MODE=release

# Agregar dominio de producción
CORS_ALLOWED_ORIGINS=https://milejuego.com,https://www.milejuego.com

# Usar contraseñas seguras
DB_PASSWORD=TuContraseñaSuperSegura123!
```

2. **Build y deploy:**

```bash
docker-compose -f docker-compose.yml up -d --build
```

3. **Configurar reverse proxy (Nginx/Caddy)**

Ejemplo Nginx:

```nginx
server {
    listen 80;
    server_name milejuego.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **Producción en Cloud (AWS, DigitalOcean, etc.)**

- Usar **Docker Compose** o **Kubernetes**
- Configurar **PostgreSQL managed** (RDS, Managed DB)
- Usar **S3/CDN** para assets estáticos
- Configurar **HTTPS** con Let's Encrypt

---

## 📁 Estructura del Proyecto

```
the-mile-game/
├── frontend/                 # React Application
│   ├── src/
│   │   ├── app/              # (vacío — router/providers en App.tsx)
│   │   ├── features/         # Features (quiz, ranking, postcards, admin)
│   │   │   ├── quiz/
│   │   │   │   ├── hooks/        # useQuiz.ts (lógica completa)
│   │   │   │   ├── pages/        # WelcomePage, RegisterPage, QuizPage, ThankYouPage
│   │   │   │   ├── services/     # quizApi.ts (submit, fetch answers)
│   │   │   │   ├── store/        # quizStore.ts (Zustand, persistido)
│   │   │   │   └── types/
│   │   │   ├── ranking/
│   │   │   │   ├── hooks/        # useRanking.ts (WebSocket + fetch)
│   │   │   │   ├── pages/        # RankingPage.tsx (WebSocket + 3D medals)
│   │   │   │   ├── services/     # rankingApi.ts (fetch ranking)
│   │   │   │   └── store/        # rankingStore.ts (solo currentPlayerId)
│   │   │   ├── postcards/
│   │   │   │   ├── hooks/        # usePostcards.ts (WebSocket real-time)
│   │   │   │   ├── pages/        # CorkboardPage.tsx, SecretBoxPage.tsx (pendiente)
│   │   │   │   ├── services/     # postcardApi.ts (upload + resize)
│   │   │   │   ├── store/        # postcardStore.ts (Zustand)
│   │   │   │   ├── components/   # PostcardCard, PostcardModal, AddPostcardSheet,
│   │   │   │   │                 # PushPin, StampLayer, GiftBox (pendiente)
│   │   │   │   └── types/
│   │   │   └── admin/            # (pendiente - Secret Box)
│   │   │       └── pages/        # AdminPage.tsx (pendiente)
│   │   ├── shared/           # Shared code
│   │   │   ├── components/   # Button, Header, PageLayout, ButterflyBackground,
│   │   │   │                 # Confetti, ErrorBoundary, Skeleton
│   │   │   ├── 3d/           # MedalCanvas, Coin3D (React Three Fiber)
│   │   │   ├── hooks/        # useScrollAnimation, usePullToRefresh
│   │   │   ├── store/        # websocketStore.ts (Zustand, singleton global)
│   │   │   └── lib/          # ApiClient (Axios singleton), featureFlags.ts
│   │   └── styles/
│   ├── testsprite_tests/     # Playwright specs (35/38 passing)
│   ├── TEST_PLAN.md          # Plan de tests E2E
│   ├── playwright.config.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── backend/                  # Go API
│   ├── cmd/api/main.go       # Entry point
│   ├── internal/
│   │   ├── handlers/         # HTTP handlers
│   │   ├── models/           # Data models
│   │   ├── repository/       # player_repository, quiz_repository,
│   │   │                     # postcard_repository, db
│   │   ├── services/         # normalizer, scorer (+tests 100% cov)
│   │   └── websocket/        # hub.go (gorilla, ping/pong, broadcast)
│   ├── migrations/           # 001_initial_schema.sql, 002_postcards.sql
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
│
├── docker-compose.yml        # Docker orchestration (3 services)
├── .env / .env.example       # Environment config
├── run-tests.sh              # Backend test runner
├── AGENTS.md                 # Architecture docs (para IA y colaboradores)
└── README.md                 # This file
```

---

## 🔌 API Endpoints

### **Base URL**: `http://localhost:8081/api` (Docker) o `http://localhost:8080/api` (Dev)

#### **Players**

```http
POST   /api/players          # Crear jugador
GET    /api/players/:id      # Obtener jugador por ID
GET    /api/players          # Listar todos los jugadores
```

**Example Request:**

```bash
curl -X POST http://localhost:8081/api/players \
  -H "Content-Type: application/json" \
  -d '{"name": "Juan", "avatar": "👤"}'
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Juan",
  "avatar": "👤",
  "score": 0,
  "created_at": "2026-02-04T10:00:00Z"
}
```

#### **Quiz**

```http
POST   /api/quiz/submit                # Enviar respuestas
GET    /api/quiz/answers/:playerId     # Obtener respuestas
```

**Example Request:**

```bash
curl -X POST http://localhost:8081/api/quiz/submit \
  -H "Content-Type: application/json" \
  -H "X-Player-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "favorites": {
      "cantante": "Taylor Swift",
      "flor": "Rosa",
      "bebida": "Café"
    },
    "preferences": {
      "cafe_te": "cafe",
      "playa_montana": "playa"
    },
    "description": "Una persona increíble"
  }'
```

**Response:**

```json
{
  "score": 8,
  "message": "Quiz submitted successfully"
}
```

#### **Ranking**

```http
GET    /api/ranking          # Obtener ranking completo
```

**Example Request:**

```bash
curl http://localhost:8081/api/ranking
```

**Response:**

```json
[
  {
    "position": 1,
    "player": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Juan",
      "avatar": "👤",
      "score": 12,
      "created_at": "2026-02-04T10:00:00Z"
    }
  },
  {
    "position": 2,
    "player": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "María",
      "avatar": "👸",
      "score": 10,
      "created_at": "2026-02-04T10:05:00Z"
    }
  }
]
```

#### **Postcards**

```http
POST   /api/postcards          # Crear postal (multipart: image + message, header: X-Player-ID)
GET    /api/postcards          # Listar todas las postales (filtra secretas no reveladas)
```

#### **Secret Box** *(pendiente)*

```http
POST   /api/postcards/secret   # Crear postal secreta (multipart, header: X-Secret-Token)
GET    /api/admin/secret-box   # Listar postcards secretas (header: X-Admin-Key)
POST   /api/admin/reveal       # Revelar Secret Box (header: X-Admin-Key)
GET    /api/admin/status       # Estado de la Secret Box (header: X-Admin-Key)
```

#### **WebSocket**

```http
GET    /ws                   # WebSocket para ranking, postcards y secret box real-time
```

El servidor emite mensajes `ranking_update`, `postcard_new` y `secret_box_reveal` (pendiente). Incluye ping/pong keepalive (54s period, 60s timeout).

#### **Health Check**

```http
GET    /health               # Health check (NO /api prefix)
```

```bash
curl http://localhost:8081/health
# {"status":"ok"}
```

---

## 🤝 Contribución

### **Proceso de Desarrollo**

1. **Fork** el repositorio
2. **Crear branch** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. **Push** al branch (`git push origin feature/nueva-funcionalidad`)
5. **Abrir Pull Request**

### **Conventional Commits**

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato, estilos
refactor: refactorización
test: tests
chore: tareas de mantenimiento
```

### **Roadmap**

#### **Completado**

- ✅ Setup Vite + React 19 + TypeScript + Tailwind 4
- ✅ Backend Go + Gin + PostgreSQL + Docker Compose
- ✅ Quiz completo (13 preguntas, scoring server-side)
- ✅ Ranking en tiempo real con WebSockets
- ✅ 3D medals con React Three Fiber
- ✅ Animaciones Framer Motion + ButterflyBackground
- ✅ Confetti y celebraciones según puntaje
- ✅ Error Boundary (global + inline para 3D)
- ✅ Skeleton loading states
- ✅ Pull-to-refresh en mobile
- ✅ Despliegue en servidor local (192.168.100.82:8081)
- ✅ Implementados `useQuiz.ts` y `quizApi.ts`
- ✅ Implementados `useRanking.ts` y `rankingApi.ts`
- ✅ Cartelera de Corcho (postcards real-time + stamps decorativos)
- ✅ Playwright E2E (35/38 passing) + Vitest unit tests
- ✅ Feature flags para corkboard

#### **En Desarrollo**

- 🔜 **Secret Box** — Postcards sorpresa reveladas con animación de caja de regalos
  - Fase 1: Backend (migration, handlers, WebSocket)
  - Fase 2: Frontend Secret Box (ruta de carga con link compartible)
  - Fase 3: Admin panel (preview + botón reveal)
  - Fase 4: Animación GiftBox (Framer Motion)
  - Fase 5: Integración y testing

#### **Pendiente**
- [ ] Video de celebración para el ganador
- [ ] Lottie animations decorativas
- [ ] Soporte de video en postcards (V2)
- [ ] Sistema de juegos múltiples (no solo quiz)

---

## 📝 Licencia

Este proyecto es para uso personal en celebraciones. Contactar al autor para uso comercial.

---

## 👤 Autor

Desarrollado para el cumpleaños de Mile ✨

---

## 🐛 Troubleshooting

### **Error: "Cannot connect to backend"**

```bash
# Verificar que los servicios están corriendo
docker-compose ps

# Ver logs del backend
docker-compose logs backend

# Verificar health check
curl http://localhost:8081/health
```

### **Error: "CORS policy blocked"**

Verificá que el origen del frontend esté en `CORS_ALLOWED_ORIGINS` en `.env`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
```

Luego rebuild el backend:

```bash
docker-compose up -d --build backend
```

### **Error: "Database connection refused"**

```bash
# Verificar que postgres está healthy
docker-compose ps postgres

# Ver logs de postgres
docker-compose logs postgres

# Recrear volumen si es necesario (ESTO BORRA DATOS)
docker-compose down -v
docker-compose up -d
```

### **Limpiar base de datos (reset de datos)**

#### Opción A — TRUNCATE (recomendada): borra datos, mantiene schema

```bash
# 1. Encontrar el nombre del container de postgres
docker ps | grep postgres

# 2. Borrar todos los datos (jugadores, quiz y postcards)
docker exec -it <nombre-container> psql -U user -d milegame -c \
  "TRUNCATE TABLE quiz_answers, postcards, players RESTART IDENTITY CASCADE;"
```

> Útil en Dokploy u otros entornos donde no tenés acceso directo al `docker-compose.yml`.
> El schema queda intacto — no necesitás re-aplicar migraciones.

#### Opción B — Nuclear: borra schema + datos (re-ejecuta migraciones)

```bash
docker-compose down -v   # detiene servicios y elimina volúmenes
docker-compose up -d     # recrea todo desde cero (las migraciones corren solas)
```

### **Frontend no actualiza cambios**

```bash
# Rebuild frontend
docker-compose up -d --build frontend

# O en dev local, hard refresh
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

---

## 📖 Documentación

Para documentación detallada, consulta la carpeta [`docs/`](./docs/):

### Guías de Usuario
- [Theme System](./docs/guides/THEME_SYSTEM.md) - Personalización de temas visuales
- [Database Migrations](./docs/guides/MIGRATIONS.md) - Cómo ejecutar y crear migraciones

### Referencia API
- [API Overview](./docs/api/README.md) - Documentación completa de endpoints
- [Themes API](./docs/api/THEMES.md) - Endpoints de personalización de temas

### Arquitectura
- [AGENTS.md](./AGENTS.md) - Convenciones de código y estructura del proyecto

---

## 📚 Recursos

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Go Gin Framework](https://gin-gonic.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

---

**¡Que empiece el juego!** 🎮🎉
